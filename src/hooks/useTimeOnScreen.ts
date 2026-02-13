import { useEffect, useRef } from 'react';
import { logAnalyticsEvent } from '../lib/firebase';

export function useTimeOnScreen(screenName: string, screenClass?: string, additionalParameters?: Record<string, any>) {
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        startTimeRef.current = Date.now();

        return () => {
            const durationMs = Date.now() - startTimeRef.current;
            logAnalyticsEvent('time_on_screen', {
                screen_name: screenName,
                screen_class: screenClass,
                duration_ms: durationMs,
                ...additionalParameters
            });
        };
    }, [screenName, screenClass, additionalParameters]);
}
