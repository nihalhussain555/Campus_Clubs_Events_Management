import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, ScanLine } from 'lucide-react';

import { eventAPI } from '../services/api';

// The frame is sampled well below the camera's native resolution: QR location
// dominates jsQR's cost and 640px decodes a phone screen held at arm's length.
const DECODE_WIDTH = 640;
const TICK_MS = 250;

const cameraErrorMessage = (error) => {
  if (!window.isSecureContext) {
    return 'Camera access needs HTTPS. Paste the code instead.';
  }

  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'Camera permission was blocked. Allow it for this site, or paste the code instead.';
  }

  if (
    error?.name === 'NotFoundError' ||
    error?.name === 'NotReadableError' ||
    error?.name === 'OverconstrainedError'
  ) {
    return 'No usable camera was found. Paste the code instead.';
  }

  return 'The camera could not be started. Paste the code instead.';
};

const outcomeMessage = (data) => {
  const base = data?.message || 'Attendance recorded';

  if (data?.xpAwarded > 0) {
    return `${base} · ${data.xpAwarded} XP awarded`;
  }

  // A second scan of an already recorded student pays nothing, so say why.
  if (data?.xpAwarded === 0) {
    return `${base} · already credited, no XP added`;
  }

  return base;
};

// Organiser side of the QR check-in flow: scan the student's code with the
// camera, or paste it if a camera is unavailable. Reused by Events and the
// leader desk.
const EventCheckInDesk = ({ event, onVerified, onNotify }) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const jsqrRef = useRef(null);
  const tickRef = useRef(null);

  // Detection runs on a timer, so it reads the newest handlers through a ref
  // instead of pinning the closure from the render that started the camera.
  const scanRef = useRef(null);
  const loopAliveRef = useRef(false);
  const timerRef = useRef(null);
  const busyRef = useRef(false);

  // A code stays in view while the organiser holds the phone steady, so each
  // payload is only submitted once per session unless the scan fails.
  const handledRef = useRef(new Set());

  const stopCamera = () => {
    loopAliveRef.current = false;
    window.clearTimeout(timerRef.current);

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    handledRef.current.clear();
    setPreviewReady(false);
    setCameraOn(false);
  };

  const runCheckIn = async (token) => {
    if (busyRef.current) {
      return false;
    }

    busyRef.current = true;
    setBusy(true);

    try {
      const response = await eventAPI.checkIn(event._id, token);

      onNotify({
        message: outcomeMessage(response),
        type: 'success'
      });

      setCode('');

      await onVerified();

      return true;
    } catch (error) {
      onNotify({
        message:
          error.response?.data?.message ||
          error.message ||
          'Unable to record attendance',
        type: 'error'
      });

      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    const token = code.trim();

    if (!token) {
      onNotify({
        message: 'Scan or paste the student check-in code first',
        type: 'error'
      });

      return;
    }

    await runCheckIn(token);
  };

  const getJsQR = () => {
    if (!jsqrRef.current) {
      // Only downloaded on browsers without native barcode detection.
      jsqrRef.current = import('jsqr').then((module) => module.default || module);
    }

    return jsqrRef.current;
  };

  const submitDecoded = async (value) => {
    const token = String(value || '').trim();

    if (!token || busyRef.current || handledRef.current.has(token)) {
      return;
    }

    handledRef.current.add(token);

    const recorded = await runCheckIn(token);

    if (!recorded) {
      handledRef.current.delete(token);
    }
  };

  const decodeWithCanvas = async (video) => {
    const jsQR = await getJsQR();

    if (!jsQR) {
      return;
    }

    if (video.readyState < 2 || !video.videoWidth) {
      return;
    }

    const width = Math.min(DECODE_WIDTH, video.videoWidth);
    const height = Math.round(
      (video.videoHeight * width) / video.videoWidth
    );

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(video, 0, 0, width, height);

    const { data } = context.getImageData(0, 0, width, height);
    const result = jsQR(data, width, height, {
      inversionAttempts: 'dontInvert'
    });

    if (result?.data) {
      await submitDecoded(result.data);
    }
  };

  const scanFrame = async () => {
    const video = videoRef.current;

    if (!video || busyRef.current || video.readyState < 2) {
      return;
    }

    if (detectorRef.current) {
      const codes = await detectorRef.current.detect(video);
      const value = codes?.[0]?.rawValue;

      if (value) {
        await submitDecoded(value);
      }

      return;
    }

    await decodeWithCanvas(video);
  };

  useEffect(() => {
    scanRef.current = scanFrame;
  });

  useEffect(() => {
    if (!cameraOn) {
      return undefined;
    }

    const video = videoRef.current;

    if (video && streamRef.current) {
      video.srcObject = streamRef.current;
    }

    loopAliveRef.current = true;

    const tick = async () => {
      if (!loopAliveRef.current) {
        return;
      }

      try {
        await scanRef.current?.();
      } catch {
        // One unreadable frame should not end the session.
      }

      if (loopAliveRef.current) {
        timerRef.current = window.setTimeout(tick, TICK_MS);
      }
    };

    timerRef.current = window.setTimeout(tick, TICK_MS);

    return () => {
      loopAliveRef.current = false;
      window.clearTimeout(timerRef.current);
    };
  }, [cameraOn]);

  useEffect(() => stopCamera, []);

  const startCamera = async () => {
    setCameraError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser has no camera access. Paste the code instead.');

      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;

      // Native detection is faster and more accurate; jsQR covers the browsers
      // (Safari, Firefox) that leave it out.
      detectorRef.current =
        typeof BarcodeDetector === 'function'
          ? new BarcodeDetector({ formats: ['qr_code'] })
          : null;

      setCameraOn(true);
    } catch (error) {
      setCameraError(cameraErrorMessage(error));
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        <ScanLine size={15} className="text-[#145f82]" />
        Verify a student check-in code
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
          className="field flex-1"
          placeholder="Paste the code from the scanned QR"
          aria-label={`Check-in code for ${event.title}`}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="btn-success shrink-0"
        >
          {busy ? 'Verifying...' : 'Check in'}
        </button>

        <button
          type="button"
          onClick={cameraOn ? stopCamera : startCamera}
          className="btn-secondary shrink-0"
        >
          {cameraOn ? <CameraOff size={17} /> : <Camera size={17} />}
          {cameraOn ? 'Stop camera' : 'Scan QR'}
        </button>

      </div>

      {cameraError && (
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
          {cameraError}
        </p>
      )}

      {cameraOn && (
        <div className="relative mt-3 overflow-hidden rounded-2xl bg-black">

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={() => setPreviewReady(true)}
            className="h-64 w-full object-contain"
            aria-label={`Camera scanning for ${event.title}`}
          />

          {!previewReady && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-bold text-white">
              <Loader2 size={18} className="animate-spin" />
              Starting camera...
            </div>
          )}

        </div>
      )}

      {cameraOn && previewReady && (
        <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
          Hold the student&apos;s QR code in frame. Attendance and XP are
          recorded automatically, and each code is accepted once.
        </p>
      )}

    </div>
  );
};

export default EventCheckInDesk;
