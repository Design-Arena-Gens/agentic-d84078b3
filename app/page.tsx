"use client";

import React, { useEffect, useRef, useState } from "react";

type RecordingState = "idle" | "recording" | "processing" | "done" | "error";

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [recState, setRecState] = useState<RecordingState>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number>(10);

  // Animation state held outside React to avoid re-renders
  const animRef = useRef({
    startTime: 0,
    lastTime: 0,
    running: false,
    width: 1280,
    height: 720,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    animRef.current.running = true;

    const trees = generateTrees(24, animRef.current.width, animRef.current.height);

    const render = (t: number) => {
      if (!animRef.current.running) return;
      const { width: W, height: H } = animRef.current;
      if (animRef.current.startTime === 0) animRef.current.startTime = t;
      const elapsed = (t - animRef.current.startTime) / 1000; // seconds

      // Background sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#a8d0ff");
      sky.addColorStop(1, "#e8f6ff");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Far hills
      drawHills(ctx, W, H, elapsed);

      // Parallax forest layers
      drawForest(ctx, W, H, trees, elapsed);

      // Ground
      const grd = ctx.createLinearGradient(0, H * 0.7, 0, H);
      grd.addColorStop(0, "#5aa35a");
      grd.addColorStop(1, "#2e6b2e");
      ctx.fillStyle = grd;
      ctx.fillRect(0, H * 0.72, W, H * 0.28);

      // Cat
      drawCat(ctx, elapsed, W, H);

      // Foreground grass blades
      drawGrass(ctx, W, H, elapsed);

      requestAnimationFrame(render);
    };

    const raf = requestAnimationFrame(render);
    return () => {
      animRef.current.running = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleRecord = async () => {
    setErrorMsg(null);
    setVideoUrl(null);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!("captureStream" in canvas)) {
      setErrorMsg("Canvas captureStream not supported in this browser.");
      setRecState("error");
      return;
    }

    const stream = (canvas as any).captureStream(60) as MediaStream;

    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    let mimeType = "";
    for (const mt of mimeTypes) {
      if ((window as any).MediaRecorder && MediaRecorder.isTypeSupported(mt)) {
        mimeType = mt;
        break;
      }
    }

    if (!mimeType) {
      setErrorMsg("MediaRecorder with WebM is not supported by this browser.");
      setRecState("error");
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onerror = (e) => {
      setErrorMsg((e as any)?.error?.message || "Recording error");
      setRecState("error");
    };

    setRecState("recording");
    recorder.start();

    await wait(durationSec * 1000);

    setRecState("processing");
    recorder.stop();

    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    const url = URL.createObjectURL(blob);
    setVideoUrl(url);
    setRecState("done");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f172a",
      color: "#fff",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji"
    }}>
      <div style={{ width: 1280, maxWidth: "95vw" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Cat in Forest ? Video Generator</h1>
        <p style={{ opacity: 0.9, marginBottom: 16 }}>Animated canvas of a cat moving through a stylized forest. Record and download as WebM.</p>

        <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.4)", background: "#111" }}>
          <canvas ref={canvasRef} width={1280} height={720} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Duration (sec):</span>
            <input
              type="number"
              min={1}
              max={60}
              value={durationSec}
              onChange={(e) => setDurationSec(Math.max(1, Math.min(60, Number(e.target.value))))}
              style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#fff", width: 100 }}
            />
          </label>

          <button onClick={handleRecord} disabled={recState === "recording" || recState === "processing"} style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #334155",
            background: recState === "recording" ? "#ef4444" : "#1f2937",
            color: "white",
            cursor: recState === "recording" || recState === "processing" ? "not-allowed" : "pointer",
            fontWeight: 700
          }}>
            {recState === "idle" && "Record Video"}
            {recState === "recording" && "Recording..."}
            {recState === "processing" && "Processing..."}
            {recState === "done" && "Record Again"}
            {recState === "error" && "Retry Recording"}
          </button>

          {videoUrl && (
            <a href={videoUrl} download={`cat-forest-${Date.now()}.webm`} style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #334155",
              background: "#0b1220",
              color: "white",
              textDecoration: "none",
              fontWeight: 700
            }}>Download WebM</a>
          )}

          {errorMsg && <span style={{ color: "#fca5a5" }}>{errorMsg}</span>}
        </div>

        {videoUrl && (
          <div style={{ marginTop: 16 }}>
            <video src={videoUrl} controls style={{ width: "100%", borderRadius: 12, border: "1px solid #334155" }} />
          </div>
        )}
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function generateTrees(count: number, W: number, H: number) {
  const rng = mulberry32(123456);
  const trees: { x: number; baseY: number; height: number; width: number; layer: number; hue: number }[] = [];
  for (let i = 0; i < count; i++) {
    const layer = i % 3; // 0 far, 1 mid, 2 near
    const x = rng() * W * 2 - W * 0.5; // extend beyond for parallax
    const baseY = H * (0.65 + layer * 0.08) + (rng() - 0.5) * 20;
    const height = H * (0.12 + layer * 0.08) * (0.8 + rng() * 0.4);
    const width = height * (0.06 + rng() * 0.04);
    const hue = 115 + layer * 10 + rng() * 10;
    trees.push({ x, baseY, height, width, layer, hue });
  }
  return trees.sort((a, b) => a.layer - b.layer);
}

function drawForest(ctx: CanvasRenderingContext2D, W: number, H: number, trees: ReturnType<typeof generateTrees>, t: number) {
  for (const tr of trees) {
    const speed = [8, 16, 32][tr.layer];
    const px = ((tr.x - t * speed) % (W * 2)) + W; // wrap around

    // trunk
    ctx.fillStyle = `hsl(${tr.hue}, 25%, ${30 + tr.layer * 5}%)`;
    ctx.fillRect(px, tr.baseY - tr.height, tr.width, tr.height);

    // canopy
    const canopyW = tr.width * 6;
    const canopyH = tr.height * 0.8;
    ctx.fillStyle = `hsl(${tr.hue}, 35%, ${28 + tr.layer * 8}%)`;
    drawBlob(ctx, px - canopyW * 0.3, tr.baseY - tr.height - canopyH * 0.5, canopyW, canopyH);
  }
}

function drawBlob(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rx = Math.cos(a) * w * (0.45 + 0.1 * noise2D(Math.cos(a), Math.sin(a)));
    const ry = Math.sin(a) * h * (0.45 + 0.1 * noise2D(Math.sin(a), Math.cos(a)));
    const px = x + w * 0.5 + rx;
    const py = y + h * 0.5 + ry;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHills(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const yBase = H * (0.55 - i * 0.07);
    ctx.fillStyle = `hsl(${140 + i * 8}, 25%, ${70 - i * 8}%)`;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      const y = yBase + 30 * Math.sin((x + i * 200) * 0.004 + t * (0.05 + i * 0.02));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGrass(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const blades = 140;
  ctx.strokeStyle = "#2a5f2a";
  ctx.lineWidth = 2;
  for (let i = 0; i < blades; i++) {
    const x = ((i / blades) * W + (Math.sin((t + i) * 0.7) * 20)) % W;
    const h = 30 + 20 * Math.sin(i * 0.5 + t * 1.2);
    const sway = Math.sin(t * 2 + i) * 8;
    ctx.beginPath();
    ctx.moveTo(x, H * 0.98);
    ctx.quadraticCurveTo(x + sway, H * 0.98 - h * 0.6, x + sway * 1.6, H * 0.98 - h);
    ctx.stroke();
  }
}

function drawCat(ctx: CanvasRenderingContext2D, t: number, W: number, H: number) {
  const groundY = H * 0.78;
  const speed = 140; // px/sec
  const loopW = W + 300;
  const x = ((t * speed) % loopW) - 150; // start off-screen

  const step = Math.sin(t * 8);
  const bob = Math.sin(t * 6) * 4;

  const bodyY = groundY - 80 + bob;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(x + 120, groundY + 6, 80, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 40, bodyY - 10);
  ctx.quadraticCurveTo(x - 20, bodyY - 50 - step * 8, x + 10, bodyY - 70 - step * 4);
  ctx.stroke();

  // Body
  ctx.fillStyle = "#444";
  ctx.beginPath();
  ctx.ellipse(x + 110, bodyY, 90, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (simple oscillation)
  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  const legY = groundY - 8;
  for (let i = 0; i < 4; i++) {
    const phase = i % 2 === 0 ? step : -step;
    const lx = x + 70 + i * 22;
    ctx.beginPath();
    ctx.moveTo(lx, bodyY + 20);
    ctx.lineTo(lx + phase * 12, legY);
    ctx.stroke();
  }

  // Head
  const headX = x + 180;
  const headY = bodyY - 10;
  ctx.fillStyle = "#4b4b4b";
  ctx.beginPath();
  ctx.ellipse(headX, headY, 34, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = "#3e3e3e";
  ctx.beginPath();
  ctx.moveTo(headX - 18, headY - 20);
  ctx.lineTo(headX - 6, headY - 40);
  ctx.lineTo(headX + 2, headY - 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(headX + 10, headY - 18);
  ctx.lineTo(headX + 24, headY - 36);
  ctx.lineTo(headX + 26, headY - 14);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = "#ffd15c";
  ctx.beginPath();
  ctx.arc(headX + 10, headY - 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(headX + 10, headY - 4, 2, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = "#e67d7d";
  ctx.beginPath();
  ctx.arc(headX - 5, headY + 4, 3, 0, Math.PI * 2);
  ctx.fill();

  // Whiskers
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(headX - 8, headY + 4 + i * 4);
    ctx.lineTo(headX - 32, headY + 2 + i * 5);
    ctx.stroke();
  }
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise2D(x: number, y: number) {
  // Simple pseudo-noise based on sin/cos mixing
  return Math.sin(x * 1.3 + y * 0.7) * Math.cos(x * 0.7 - y * 1.1) * 0.5 + 0.5;
}
