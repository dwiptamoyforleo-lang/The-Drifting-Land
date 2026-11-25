/**
 * Notification Toast Queue Component for The Drifting Land.
 * Displays unobtrusive in-game toasts for items, quests, relics, and discoveries.
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, Gem, Box, Compass, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { NotificationItem } from '../types/game';
import { NotificationSystem } from '../systems/notificationSystem';

export const NotificationToast: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const unsubscribe = NotificationSystem.subscribe((items) => {
      setNotifications(items);
    });
    return unsubscribe;
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2 max-w-sm w-full px-4">
      {notifications.map((notif) => {
        let borderClass = 'border-slate-700/80';
        let bgClass = 'bg-[#0f172a]/95';
        let textClass = 'text-slate-200';
        let Icon = Info;

        if (notif.type === 'quest') {
          borderClass = 'border-amber-500/80';
          bgClass = 'bg-[#1c1917]/95';
          textClass = 'text-amber-300';
          Icon = Sparkles;
        } else if (notif.type === 'relic') {
          borderClass = 'border-emerald-500/80';
          bgClass = 'bg-[#062016]/95';
          textClass = 'text-emerald-300';
          Icon = Gem;
        } else if (notif.type === 'item') {
          borderClass = 'border-cyan-500/80';
          bgClass = 'bg-[#082f49]/95';
          textClass = 'text-cyan-300';
          Icon = Box;
        } else if (notif.type === 'discovery') {
          borderClass = 'border-purple-500/80';
          bgClass = 'bg-[#2e1065]/95';
          textClass = 'text-purple-300';
          Icon = Compass;
        } else if (notif.type === 'danger') {
          borderClass = 'border-rose-500/80';
          bgClass = 'bg-[#29080c]/95';
          textClass = 'text-rose-300';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={notif.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${borderClass} ${bgClass} shadow-2xl backdrop-blur-none transition-all duration-300 animate-in fade-in slide-in-from-top-2 w-full`}
          >
            <div className="p-1.5 rounded-xl bg-black/40 shrink-0">
              <Icon className={`w-4 h-4 ${textClass}`} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`text-[11px] font-mono uppercase tracking-wider font-bold ${textClass}`}>
                {notif.title}
              </span>
              <span className="text-xs text-slate-300 font-sans truncate">
                {notif.message}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
