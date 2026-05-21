/**
 * GlobalLoader — slim animated top progress bar that reflects in-flight API calls.
 *
 * - Mount once at the application root.
 * - Subscribes to the API tracker, so every backend/upload call automatically animates progress.
 * - NProgress-style easing: ramps up while requests are pending, snaps to 100% on idle, then fades.
 * - Pure CSS animation; no external dependency.
 */

import React, { useEffect, useRef, useState } from 'react';
import { subscribeApiTracker } from '../services/apiTracker';

export const GlobalLoader: React.FC = () => {
    const [active, setActive] = useState(0);
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const tickerRef = useRef<number | null>(null);
    const hideRef = useRef<number | null>(null);

    useEffect(() => subscribeApiTracker(setActive), []);

    useEffect(() => {
        // Clear any pending timers from the previous transition
        if (tickerRef.current !== null) {
            window.clearInterval(tickerRef.current);
            tickerRef.current = null;
        }
        if (hideRef.current !== null) {
            window.clearTimeout(hideRef.current);
            hideRef.current = null;
        }

        if (active > 0) {
            // Rising edge: show bar, ease from current progress up to 90% while requests are in flight.
            setVisible(true);
            setProgress(prev => (prev > 0 ? prev : 8));
            tickerRef.current = window.setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev;
                    // Ease-out: faster early, slower near the cap
                    const inc = prev < 40 ? 4 : prev < 70 ? 2 : prev < 85 ? 0.8 : 0.3;
                    return Math.min(90, prev + inc);
                });
            }, 180);
        } else if (visible) {
            // Falling edge: snap to 100% then fade out
            setProgress(100);
            hideRef.current = window.setTimeout(() => {
                setVisible(false);
                setProgress(0);
            }, 350);
        }

        return () => {
            if (tickerRef.current !== null) window.clearInterval(tickerRef.current);
            if (hideRef.current !== null) window.clearTimeout(hideRef.current);
        };
    }, [active, visible]);

    if (!visible && progress === 0) return null;

    const isFinishing = active === 0 && progress >= 100;

    return (
        <div
            aria-hidden
            className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
        >
            <div
                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400"
                style={{
                    width: `${progress}%`,
                    boxShadow: '0 0 10px rgba(16, 185, 129, 0.6), 0 0 4px rgba(16, 185, 129, 0.45)',
                    transition: isFinishing ? 'width 200ms ease-out, opacity 300ms ease-out 100ms' : 'width 220ms ease-out',
                    opacity: isFinishing ? 0 : 1,
                }}
            />
        </div>
    );
};

export default GlobalLoader;
