#!/usr/bin/env node
// Minimal agent runner for LiveKit - Node.js
// Usage:
//   Set LIVEKIT_URL and either AGENT_TOKEN or AGENT_TOKEN_ENDPOINT
//   AGENT_TOKEN_ENDPOINT should be a POST endpoint returning { agentToken, roomName, agentIdentity }
//   Install deps: pnpm add livekit-client wrtc

const wrtc = require('wrtc');
const { connect } = require('livekit-client');

async function getTokenFromEndpoint(endpoint, agentName, agentIdentity) {
  const body = {};
  if (agentName) body.agent_name = agentName;
  if (agentIdentity) body.agentIdentity = agentIdentity;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`failed to fetch token: ${res.status} ${res.statusText}`);
  return await res.json();
}

async function run() {
  const url = process.env.LIVEKIT_URL;
  if (!url) {
    console.error('Set LIVEKIT_URL in environment');
    process.exit(1);
  }

  let token = process.env.AGENT_TOKEN;
  if (!token && process.env.AGENT_TOKEN_ENDPOINT) {
    console.log('Fetching agent token from', process.env.AGENT_TOKEN_ENDPOINT);
    const data = await getTokenFromEndpoint(
      process.env.AGENT_TOKEN_ENDPOINT,
      process.env.AGENT_NAME,
      process.env.AGENT_IDENTITY
    );
    token = data.agentToken || data.participantToken;
    console.log(
      'Received token for',
      data.agentIdentity || process.env.AGENT_IDENTITY || 'unknown'
    );
  }

  if (!token) {
    console.error('No AGENT_TOKEN or AGENT_TOKEN_ENDPOINT configured.');
    process.exit(1);
  }

  try {
    console.log('Connecting to', url);
    const room = await connect(url, token, { WebRtcAdapter: wrtc });
    console.log('Connected as', room.localParticipant?.identity || 'unknown');

    room.on('participantConnected', (p) => console.log('[room] participantConnected', p.identity));
    room.on('participantDisconnected', (p) =>
      console.log('[room] participantDisconnected', p.identity)
    );
    room.on('disconnected', () => {
      console.log('Disconnected from room');
      process.exit(0);
    });

    // Keep process alive
    console.log('Agent runner is active. Press Ctrl+C to exit.');
    // eslint-disable-next-line no-empty
    while (true) await new Promise((r) => setTimeout(r, 60_000));
  } catch (err) {
    console.error('agent-runner error', err);
    process.exit(1);
  }
}

run();
