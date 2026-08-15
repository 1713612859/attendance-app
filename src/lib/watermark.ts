export interface WatermarkInfo {
  dateTimeStr: string;
  address: string;
  name: string;
  employeeId: string;
  sessionLabel: string;
  brandLabel: string;
}

function wrapLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const lines: string[] = [];
  let current = "";
  for (const ch of text) {
    const next = current + ch;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// 在给定的 canvas（已绘制好原始画面）上叠加水印文字，返回最终 dataURL。
export function drawWatermark(canvas: HTMLCanvasElement, info: WatermarkInfo): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/jpeg", 0.9);

  const w = canvas.width;
  const h = canvas.height;
  const pad = Math.max(14, w * 0.035);
  const maxTextWidth = w - pad * 2;
  // 字号改为固定值（不再按画布宽度线性放大），避免长地址/长姓名在竖屏画布上超宽换行错位
  const fontSize = 15;
  const lineHeight = Math.round(fontSize * 1.55);

  const rawLines = [
    `${info.name} (${info.employeeId})`,
    info.address,
    `${info.sessionLabel} · ${info.dateTimeStr}`,
  ];

  ctx.font = `400 ${fontSize}px sans-serif`;
  // 记录每一段换行后文本属于原始第几行，用来决定是否加粗（姓名行加粗）
  const wrapped: { text: string; bold: boolean }[] = rawLines.flatMap((line, idx) =>
    wrapLine(ctx, line, maxTextWidth).map((text) => ({ text, bold: idx === 0 }))
  );

  const gradHeight = lineHeight * wrapped.length + pad * 1.6;
  const gradient = ctx.createLinearGradient(0, h - gradHeight, 0, h);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, h - gradHeight, w, gradHeight);

  ctx.textBaseline = "bottom";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 3;

  let y = h - pad;
  for (let i = wrapped.length - 1; i >= 0; i--) {
    ctx.font = `${wrapped[i].bold ? "700" : "400"} ${fontSize}px sans-serif`;
    ctx.fillText(wrapped[i].text, pad, y);
    y -= lineHeight;
  }

  // 左上角角标，标识"考勤打卡凭证"
  ctx.font = `600 ${Math.max(11, fontSize - 4)}px sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.shadowBlur = 2;
  ctx.fillText(info.brandLabel, pad, pad * 0.6);

  return canvas.toDataURL("image/jpeg", 0.88);
}

// 无相机权限/无相机设备时的兜底占位图（渐变背景 + 提示文字），保证流程仍可跑通
export function drawPlaceholderPhoto(canvas: HTMLCanvasElement, title: string, subtitle: string): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = 720;
  canvas.height = 960;
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, "#123a28");
  g.addColorStop(1, "#2a6e45");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "400 18px sans-serif";
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 16);
  ctx.textAlign = "start";
}
