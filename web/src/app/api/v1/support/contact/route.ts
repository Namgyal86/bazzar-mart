import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'support-messages.json');

function readMessages() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeMessages(messages: unknown[]) {
  fs.writeFileSync(FILE, JSON.stringify(messages, null, 2));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const messages = readMessages();
  const newMessage = {
    id: Date.now().toString(),
    ...body,
    source: 'contact',
    createdAt: new Date().toISOString(),
  };
  messages.unshift(newMessage);
  writeMessages(messages);
  return NextResponse.json({ success: true, data: newMessage });
}
