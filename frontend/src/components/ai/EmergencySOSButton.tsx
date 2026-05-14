import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, Siren, Wifi, WifiOff } from "lucide-react";

import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type LiveVitals = {
  heartRate: number;
  spo2: number;
  temperature: number;
  bpSystolic: number;
  bpDiastolic: number;
};

const DEFAULT_VITALS: LiveVitals = {
  heartRate: 108,
  spo2: 91,
  temperature: 38.2,
  bpSystolic: 138,
  bpDiastolic: 92,
};

const wsUrlBase = (import.meta.env.VITE_IOT_WS_URL || "").trim();

function getLocation(): Promise<number[] | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve([position.coords.latitude, position.coords.longitude]),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 6000 }
    );
  });
}

export function EmergencySOSButton() {
  const { toast } = useToast();
  const [vitals, setVitals] = useState<LiveVitals>(DEFAULT_VITALS);
  const [wsConnected, setWsConnected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [criticalAutoDetected, setCriticalAutoDetected] = useState(false);
  const autoDispatchedRef = useRef(false);

  const criticalFlags = useMemo(() => {
    return {
      heartRate: vitals.heartRate > 130 || vitals.heartRate < 45,
      spo2: vitals.spo2 < 90,
      temperature: vitals.temperature >= 39,
      bp: vitals.bpSystolic > 180 || vitals.bpDiastolic > 110,
    };
  }, [vitals]);

  const isCritical = criticalFlags.heartRate || criticalFlags.spo2 || criticalFlags.temperature || criticalFlags.bp;

  const triggerEmergency = async (triggerType: "MANUAL_SOS" | "IOT_CRITICAL") => {
    if (sending) {
      return;
    }

    setSending(true);

    try {
      const location = await getLocation();
      const payload = {
        trigger_type: triggerType,
        vitals: {
          heart_rate: vitals.heartRate,
          spo2: vitals.spo2,
          temperature: vitals.temperature,
          bp_systolic: vitals.bpSystolic,
          bp_diastolic: vitals.bpDiastolic,
          ...(location ? { location } : {}),
        },
      };

      const { data } = await api.post("/enhanced/emergency/alert", payload);

      toast({
        title: "Emergency alert sent",
        description: data?.message || "Nearby hospitals and services have been notified.",
      });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast({
        title: "SOS dispatch failed",
        description: typeof detail === "string" ? detail : "Unable to reach emergency services right now.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!wsUrlBase) {
      return;
    }

    const user = localStorage.getItem("user");
    const userId = user ? JSON.parse(user)?.id : null;

    if (!userId) {
      return;
    }

    const wsUrl = `${wsUrlBase.replace(/\/+$/, "")}/iot/${userId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const incomingVitals = message?.vitals;

        if (incomingVitals && typeof incomingVitals === "object") {
          setVitals((previous) => ({
            heartRate: Number(incomingVitals.heart_rate ?? previous.heartRate),
            spo2: Number(incomingVitals.spo2 ?? previous.spo2),
            temperature: Number(incomingVitals.temperature ?? previous.temperature),
            bpSystolic: Number(incomingVitals.bp_systolic ?? previous.bpSystolic),
            bpDiastolic: Number(incomingVitals.bp_diastolic ?? previous.bpDiastolic),
          }));
        }
      } catch {
        // Ignore malformed IoT packets.
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (countdown === null || countdown < 0) {
      return;
    }

    if (countdown === 0) {
      void triggerEmergency("MANUAL_SOS");
      setCountdown(null);
      return;
    }

    const timer = window.setTimeout(() => setCountdown((current) => (current === null ? null : current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (!isCritical) {
      autoDispatchedRef.current = false;
      setCriticalAutoDetected(false);
      return;
    }

    setCriticalAutoDetected(true);

    if (autoDispatchedRef.current) {
      return;
    }

    autoDispatchedRef.current = true;
    void triggerEmergency("IOT_CRITICAL");
  }, [isCritical]);

  return (
    <>
      <div className="fixed z-50 right-4 bottom-4 flex flex-col items-end gap-2">
        {countdown !== null ? (
          <div className="rounded-full bg-destructive text-destructive-foreground px-4 py-2 text-sm font-bold shadow-lg animate-pulse">
            Dispatching SOS in {countdown}s
          </div>
        ) : null}

        <Button
          type="button"
          onClick={() => setCountdown((current) => (current === null ? 5 : null))}
          disabled={sending}
          className="rounded-full h-14 px-6 bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Siren className="h-5 w-5 mr-2" />}
          Emergency SOS
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={() => setPanelOpen((open) => !open)}>
          {panelOpen ? "Hide Vitals" : "Show Vitals"}
        </Button>
      </div>

      {panelOpen ? (
        <Card className="fixed z-40 right-4 bottom-28 w-[320px] border-border/50 shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${isCritical ? "text-destructive" : "text-emerald-500"}`} />
                IoT Emergency Monitor
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {wsUrlBase ? (
                  wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {wsUrlBase ? (wsConnected ? "Live" : "Offline") : "Manual"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Heart Rate</Label>
                <Input
                  value={vitals.heartRate}
                  onChange={(e) => setVitals((v) => ({ ...v, heartRate: Number(e.target.value) || 0 }))}
                  type="number"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">SpO2</Label>
                <Input
                  value={vitals.spo2}
                  onChange={(e) => setVitals((v) => ({ ...v, spo2: Number(e.target.value) || 0 }))}
                  type="number"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Temperature</Label>
                <Input
                  value={vitals.temperature}
                  onChange={(e) => setVitals((v) => ({ ...v, temperature: Number(e.target.value) || 0 }))}
                  type="number"
                  step="0.1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">BP Systolic</Label>
                <Input
                  value={vitals.bpSystolic}
                  onChange={(e) => setVitals((v) => ({ ...v, bpSystolic: Number(e.target.value) || 0 }))}
                  type="number"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">BP Diastolic</Label>
                <Input
                  value={vitals.bpDiastolic}
                  onChange={(e) => setVitals((v) => ({ ...v, bpDiastolic: Number(e.target.value) || 0 }))}
                  type="number"
                />
              </div>
            </div>

            <div className={`rounded-lg p-2 text-xs ${isCritical ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600"}`}>
              {isCritical
                ? "Critical thresholds detected. Automatic emergency dispatch is enabled."
                : "Vitals are currently in non-critical range."}
            </div>

            {criticalAutoDetected ? (
              <div className="text-xs text-muted-foreground">
                Critical vitals have been detected in this session. Alerts are deduplicated until vitals normalize.
              </div>
            ) : null}

            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => void triggerEmergency("MANUAL_SOS")}
              disabled={sending}
            >
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send SOS Now
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

export default EmergencySOSButton;
