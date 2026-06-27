#!/usr/bin/env python3
"""
Minimal TCP MQTT broker in pure Python.
Supports: CONNECT, CONNACK, PUBLISH (QoS 0/1), SUBSCRIBE, SUBACK, PUBACK, PINGREQ, PINGRESP, DISCONNECT
Enough for lansub simulator ↔ backend communication.
"""

import asyncio
import logging
import struct

logging.basicConfig(level=logging.INFO, format='%(asctime)s [MQTT-BROKER] %(message)s')
log = logging.getLogger('mqtt_broker')

HOST = '0.0.0.0'
PORT = 1883

# {topic_filter: set of (writer, client_id)}
subscriptions = {}
clients = {}  # client_id → writer


def decode_string(data, offset):
    length = struct.unpack('!H', data[offset:offset+2])[0]
    return data[offset+2:offset+2+length].decode('utf-8', errors='replace'), offset+2+length


def encode_string(s):
    b = s.encode('utf-8')
    return struct.pack('!H', len(b)) + b


def encode_remaining_length(length):
    result = b''
    while True:
        byte = length % 128
        length //= 128
        if length > 0:
            byte |= 0x80
        result += bytes([byte])
        if length == 0:
            break
    return result


def decode_remaining_length(data, offset):
    multiplier = 1
    value = 0
    while True:
        byte = data[offset]
        offset += 1
        value += (byte & 0x7F) * multiplier
        multiplier *= 128
        if not (byte & 0x80):
            break
    return value, offset


def matches_topic(filter_topic, topic):
    """Simple wildcard matching: # and +"""
    if filter_topic == topic:
        return True
    if filter_topic.endswith('/#'):
        prefix = filter_topic[:-2]
        return topic.startswith(prefix + '/') or topic == prefix
    if '#' in filter_topic:
        return True
    parts_f = filter_topic.split('/')
    parts_t = topic.split('/')
    if len(parts_f) != len(parts_t):
        return False
    for f, t in zip(parts_f, parts_t):
        if f != '+' and f != t:
            return False
    return True


class MQTTClient:
    def __init__(self, reader, writer):
        self.reader = reader
        self.writer = writer
        self.client_id = ''
        self.subscriptions = set()
        self.addr = writer.get_extra_info('peername')

    async def handle(self):
        log.info(f'Client connected: {self.addr}')
        try:
            while True:
                # Read fixed header
                header_byte = await self.reader.readexactly(1)
                ptype = (header_byte[0] >> 4) & 0xF
                flags = header_byte[0] & 0xF

                # Read remaining length
                rl = 0
                multiplier = 1
                while True:
                    b = await self.reader.readexactly(1)
                    rl += (b[0] & 0x7F) * multiplier
                    multiplier *= 128
                    if not (b[0] & 0x80):
                        break

                payload = await self.reader.readexactly(rl) if rl > 0 else b''
                await self._handle_packet(ptype, flags, payload)

        except (asyncio.IncompleteReadError, ConnectionResetError):
            pass
        except Exception as e:
            log.error(f'Client {self.addr} error: {e}')
        finally:
            self._cleanup()
            log.info(f'Client disconnected: {self.addr}')

    async def _handle_packet(self, ptype, flags, payload):
        if ptype == 1:   # CONNECT
            await self._handle_connect(payload)
        elif ptype == 3: # PUBLISH
            await self._handle_publish(flags, payload)
        elif ptype == 4: # PUBACK
            pass
        elif ptype == 8: # SUBSCRIBE
            await self._handle_subscribe(payload)
        elif ptype == 10: # UNSUBSCRIBE
            pass
        elif ptype == 12: # PINGREQ
            self.writer.write(b'\xd0\x00')  # PINGRESP
            await self.writer.drain()
        elif ptype == 14: # DISCONNECT
            raise ConnectionResetError('Client disconnect')

    async def _handle_connect(self, payload):
        offset = 0
        # Protocol name
        proto_name, offset = decode_string(payload, offset)
        proto_level = payload[offset]; offset += 1
        connect_flags = payload[offset]; offset += 1
        keepalive = struct.unpack('!H', payload[offset:offset+2])[0]; offset += 2
        # Client ID
        client_id, offset = decode_string(payload, offset)
        self.client_id = client_id or f'auto_{id(self)}'
        clients[self.client_id] = self

        # CONNACK: session present=0, return code=0 (accepted)
        self.writer.write(b'\x20\x02\x00\x00')
        await self.writer.drain()
        log.info(f'CONNECT accepted: client_id={self.client_id}')

    async def _handle_publish(self, flags, payload):
        qos = (flags >> 1) & 0x3
        retain = flags & 0x1
        dup = (flags >> 3) & 0x1
        offset = 0
        topic, offset = decode_string(payload, offset)
        packet_id = None
        if qos > 0:
            packet_id = struct.unpack('!H', payload[offset:offset+2])[0]
            offset += 2
        message = payload[offset:]

        # Send PUBACK for QoS 1
        if qos == 1 and packet_id is not None:
            self.writer.write(b'\x40\x02' + struct.pack('!H', packet_id))
            await self.writer.drain()

        # Distribute to subscribers
        await self._distribute(topic, qos, message)

    async def _distribute(self, topic, qos, message):
        sent = set()
        for filter_topic, subs in list(subscriptions.items()):
            if matches_topic(filter_topic, topic):
                for (writer, cid) in list(subs):
                    if cid not in sent:
                        sent.add(cid)
                        try:
                            # Build PUBLISH packet
                            topic_b = encode_string(topic)
                            payload = topic_b + message
                            rl = encode_remaining_length(len(payload))
                            writer.write(b'\x30' + rl + payload)
                            await writer.drain()
                        except Exception:
                            subs.discard((writer, cid))

    async def _handle_subscribe(self, payload):
        packet_id = struct.unpack('!H', payload[0:2])[0]
        offset = 2
        granted_qos = []
        while offset < len(payload):
            topic_filter, offset = decode_string(payload, offset)
            requested_qos = payload[offset]; offset += 1
            if topic_filter not in subscriptions:
                subscriptions[topic_filter] = set()
            subscriptions[topic_filter].add((self.writer, self.client_id))
            self.subscriptions.add(topic_filter)
            granted_qos.append(min(requested_qos, 1))
            log.info(f'{self.client_id} subscribed to: {topic_filter}')

        # SUBACK
        body = struct.pack('!H', packet_id) + bytes(granted_qos)
        rl = encode_remaining_length(len(body))
        self.writer.write(b'\x90' + rl + body)
        await self.writer.drain()

    def _cleanup(self):
        for topic_filter in self.subscriptions:
            if topic_filter in subscriptions:
                subscriptions[topic_filter].discard((self.writer, self.client_id))
        clients.pop(self.client_id, None)
        try:
            self.writer.close()
        except Exception:
            pass


async def main():
    server = await asyncio.start_server(
        lambda r, w: MQTTClient(r, w).handle(),
        HOST, PORT,
    )
    log.info(f'✅ MQTT Broker listening on {HOST}:{PORT}')
    async with server:
        await server.serve_forever()


if __name__ == '__main__':
    asyncio.run(main())
