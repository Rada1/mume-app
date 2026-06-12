/**
 * @file useShaperProjectSubscription.ts
 * @description Applies incoming Shaper project sync events to local workspace state.
 */

import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { listShaperProjects, subscribeShaperProjectEvents } from '../model/shaperProjectStore';
import type { ShaperProjectSummary, ShaperWorkspaceDoc } from '../model/shaperTypes';

interface ShaperProjectSubscriptionArgs {
    setProjects: Dispatch<SetStateAction<ShaperProjectSummary[]>>;
    setDoc: Dispatch<SetStateAction<ShaperWorkspaceDoc | null>>;
}

// --- Hook Section ---
export const useShaperProjectSubscription = ({
    setProjects,
    setDoc
}: ShaperProjectSubscriptionArgs): void => {
    useEffect(() => subscribeShaperProjectEvents(event => {
        setProjects(listShaperProjects());
        setDoc(current => {
            if (event.type === 'project-deleted') return current?.id === event.projectId ? null : current;
            if (event.type === 'room-patched') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room || event.updatedAt <= current.updatedAt) return current;
                return { ...current, updatedAt: event.updatedAt, rooms: { ...current.rooms, [event.roomId]: { ...room, ...event.patch } } };
            }
            if (event.type === 'annotation-added') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room || room.annotations.some(item => item.id === event.annotation.id)) return current;
                return {
                    ...current,
                    updatedAt: Math.max(current.updatedAt, event.updatedAt),
                    rooms: { ...current.rooms, [event.roomId]: { ...room, annotations: [...room.annotations, event.annotation] } }
                };
            }
            if (event.type === 'annotation-removed') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room || !room.annotations.some(item => item.id === event.annotationId)) return current;
                return {
                    ...current,
                    updatedAt: Math.max(current.updatedAt, event.updatedAt),
                    rooms: { ...current.rooms, [event.roomId]: { ...room, annotations: room.annotations.filter(item => item.id !== event.annotationId) } }
                };
            }
            if (event.type === 'mob-added') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room || room.mobs.some(mob => mob.id === event.mob.id)) return current;
                return { ...current, rooms: { ...current.rooms, [event.roomId]: { ...room, mobs: [...room.mobs, event.mob] } } };
            }
            if (event.type === 'mob-removed') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room) return current;
                return { ...current, rooms: { ...current.rooms, [event.roomId]: { ...room, mobs: room.mobs.filter(mob => mob.id !== event.mobId) } } };
            }
            if (event.type === 'object-added') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room || room.objects.some(obj => obj.id === event.object.id)) return current;
                return { ...current, rooms: { ...current.rooms, [event.roomId]: { ...room, objects: [...room.objects, event.object] } } };
            }
            if (event.type === 'object-removed') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room) return current;
                return { ...current, rooms: { ...current.rooms, [event.roomId]: { ...room, objects: room.objects.filter(obj => obj.id !== event.objectId) } } };
            }
            if (event.type === 'mob-object-added' || event.type === 'mob-object-removed') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room) return current;
                const mobs = room.mobs.map(mob => {
                    if (mob.id !== event.mobId) return mob;
                    return event.type === 'mob-object-added'
                        ? { ...mob, items: mob.items.some(item => item.id === event.object.id) ? mob.items : [...mob.items, event.object] }
                        : { ...mob, items: mob.items.filter(item => item.id !== event.objectId) };
                });
                return { ...current, rooms: { ...current.rooms, [event.roomId]: { ...room, mobs } } };
            }
            if (current?.id !== event.doc.id || event.doc.updatedAt <= current.updatedAt) return current;
            return event.doc;
        });
    }), [setDoc, setProjects]);
};
