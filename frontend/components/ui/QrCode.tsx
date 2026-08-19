"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  return (
    <div className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white p-3.5 shadow-xl">
      <QRCodeSVG
        value={value}
        size={size}
        bgColor="#FFFFFF"
        fgColor="#0F172A"
        level="M"
        includeMargin={false}
      />
    </div>
  );
}
