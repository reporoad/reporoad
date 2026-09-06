'use client';
import { createContext, type RefObject } from 'react';
import type { PlaylistPlayer } from '@/lib/playlist';
export const RadioContext = createContext<{ player: RefObject<PlaylistPlayer | null>; track: number } | null>(null);
