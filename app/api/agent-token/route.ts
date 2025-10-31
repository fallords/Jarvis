import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export const revalidate = 0;

export async function POST(req: Request) {
  try {
    if (!LIVEKIT_URL) throw new Error('LIVEKIT_URL is not defined');
    if (!API_KEY) throw new Error('LIVEKIT_API_KEY is not defined');
    if (!API_SECRET) throw new Error('LIVEKIT_API_SECRET is not defined');

    const body = await req.json().catch(() => ({}));
    const agentName: string = body?.agent_name || body?.agentName || 'agent';
    const roomName: string =
      body?.roomName || `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    // allow caller to request a specific agent identity (useful for restoring an existing agent)
    const agentIdentity =
      body?.agentIdentity || body?.agent_identity || `agent_${Math.floor(Math.random() * 100_000)}`;

    const at = new AccessToken(API_KEY, API_SECRET, {
      identity: agentIdentity,
      name: agentName,
      ttl: '12h',
    } as AccessTokenOptions);

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };
    at.addGrant(grant);

    // include the agent in the roomConfig so other participants can see it in metadata
    if (agentName) {
      at.roomConfig = new RoomConfiguration({ agents: [{ agentName }] });
    }

    const data = {
      agentIdentity,
      roomName,
      agentToken: at.toJwt(),
      serverUrl: LIVEKIT_URL,
    };

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('agent-token error', err);
    if (err instanceof Error) return new NextResponse(err.message, { status: 500 });
    return new NextResponse('unknown error', { status: 500 });
  }
}
