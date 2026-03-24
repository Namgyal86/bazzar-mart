import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'admin-messages.json');

export async function GET() {
  try {
    const messages = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
    return NextResponse.json({ success: true, data: messages });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}
