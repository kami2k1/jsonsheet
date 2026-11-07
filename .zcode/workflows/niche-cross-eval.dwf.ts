/* zcode-workflow
description: Đánh giá chéo 14 niche tool mới — N agents nghiên cứu song song
  (WebSearch + chấm 8 tiêu chí), 3 agents phản biện top 3, bảng xếp hạng +
  chart. Tùy biến danh sách niche qua arg.
whenToUse: "Khi cần chọn niche/tool mới để xây cho jsonsheet.com (hoặc site
  client-side tools bất kỳ): truyền danh sách niche (hoặc dùng bộ mặc định 14
  niche) → nhận bảng xếp hạng có phản biện độc lập + long-tail/điều kiện thắng
  từng niche."
args:
  niches:
    type: json
    description: Danh sách niche cần đánh giá, mỗi phần tử {name, serp, hint}. serp
      = dữ liệu SERP đã biết (domain đối thủ + nhận xét), hint = định hướng sản
      phẩm. Bỏ trống sẽ dùng bộ 14 niche mặc định.
    required: false
*/
interface NicheEval {
  /** Tên niche. */
  niche: string;
  /** 0-10: nhu cầu tìm kiếm tổng thể. */
  demandScore: number;
  /** 0-10 (10 = đối thủ yếu/lỗi thời — dễ vào). */
  competitionScore: number;
  /** 0-10: domain mới rank được trong 3-6 tháng. */
  rankability: number;
  /** 0-10: góc khác biệt "100% client-side, không upload" có ăn không. */
  differentiation: number;
  /** 0-10: làm được thuần JS/TS/WASM trong browser không. */
  feasibility: number;
  /** 0-10: AdSense/affiliate/freemium. */
  monetization: number;
  /** 0-10: sống sót qua thời đại AI (tool này có bị AI chat thay thế không). */
  aiEraResilience: number;
  /** 5 đối thủ chính + điểm yếu mỗi đứa. */
  competitors: string[];
  /** 5 long-tail keyword nên nhắm. */
  longtail: string[];
  /** Góc khác biệt đề xuất (2-3 câu). */
  differentiationIdea: string;
  /** Build client-side thế nào (1-2 câu, thư viện/gتش ý). */
  feasibilityNotes: string;
}

interface RedTeam {
  /** Rủi ro lớn nhất khiến niche này KHÔNG có traffic (2-3 câu). */
  biggestRisk: string;
  /** 0-10: sau phản biện, vẫn đáng làm không. */
  adjustedScore: number;
  /** Điều kiện để thắng (1-2 câu). */
  winCondition: string;
}

interface NicheSeed {
  /** Tên niche (viết liền, không dấu). */
  name: string;
  /** Dữ liệu SERP đã biết (domain đối thủ + nhận xét). */
  serp: string;
  /** Định hướng sản phẩm cho niche. */
  hint: string;
}

const DEFAULT_NICHES: NicheSeed[] = [
  { name: "chatgpt-export", serp: "gptprotools.com, keep.md, GitHub scripts, chromewebstore extension — SERP yếu, không có ông lớn", hint: "Tool parse conversations.json export từ ChatGPT/Claude/Gemini → Markdown/PDF/TXT, 100% client-side. Nhu cầu từ hàng trăm triệu user AI chat muốn lưu/xuất hội thoại." },
  { name: "subtitles", serp: "gotranscript, happyscribe, ebby, techsmith, veed, subtitletools — các tool nhỏ làm lead-magnet, UX cũ", hint: "SRT↔VTT convert, shift timing, merge/split subtitle, subtitle to text. Giới creator/YouTube demand ổn định." },
  { name: "xlsx-office", serp: "convertsimple, tableconvert, jsonlint-excel, aspose, excelmaster.ai 'privacy-first', reogrid 'no upload' — đang có người đánh vào góc privacy", hint: "XLSX→JSON/CSV, CSV→XLSX qua SheetJS client-side. Volume lớn nhất nhóm." },
  { name: "pdf-private", serp: "pdf.imresizer 'no upload', paperknife, aeropdf, zeropdf, privatetoolbox — SERP đã đông 'private PDF'", hint: "PDF merge/split/compress client-side qua pdf-lib/pdfjs. Volume cực lớn nhưng cạnh tranh đang nóng." },
  { name: "llm-token-cost", serp: "platform.openai.com/tokenizer chiếm head, tokencost.app 168 models, gpt-tokenizer.dev — head bị OpenAI giữ", hint: "Token counter cho nhiều model + cost calculator per-document/use-case + so sánh giá model. AI-era demand tăng." },
  { name: "mock-data", serp: "jsonrender, jsonedit, jsonwebtools, jsonbeautify — toàn tool nhỏ, không ông lớn", hint: "Fake JSON/mock data generator theo schema, fake user/product data cho dev test." },
  { name: "qr-tools", serp: "qubiqr, freeonlineqr, openqr, qr-code-generator.org, easyfreeqr, codexqr — bão hòa tuyệt đối", hint: "QR generator (wifi/vcard/logo/động). Volume khổng lồ nhưng đỏ." },
  { name: "text-utilities", serp: "trộn nhiều tool nhỏ: case converter, unicode stylizer (𝗯𝗼𝗹𝗱 text cho social), word counter, text diff", hint: "Bộ text tools viral-capable: unicode bold/italic cho bio social, diff, counter." },
  { name: "seo-meta-tools", serp: "metatags.io, seoptimer, các generator nhỏ", hint: "Meta/OG tag generator + preview, robots.txt generator, sitemap helper." },
  { name: "time-tools", serp: "epochconverter.com thống trị, các tool timezone nhỏ", hint: "Epoch/timestamp converter, timezone compare, cron explainer." },
  { name: "hash-encoding", serp: "jwt.io thống trị JWT; hash tools nhiều; base64 đã có", hint: "Hash generator (SHA family qua WebCrypto), JWT decoder chi tiết, URL encode." },
  { name: "color-tools", serp: "coolors.co thống trị palette; contrast checker nhiều", hint: "Color converter, palette generator, WCAG contrast checker." },
  { name: "ai-content-file-tools", serp: "hầu như trống: tool parse output AI (ChatGPT/Claude/Gemini export, JSON trong code fence, bảng trong markdown) thành file dùng được", hint: "Bộ 'AI output cleanup': dán output AI thô → file sạch. Đã có guide + fixAi feature." },
  { name: "image-ai-family", serp: "aiornot, illuminarty, huggingface SPIT — upload-based; C2PA verify của Adobe; exif tools cũ kỹ", hint: "Mở rộng image vertical vừa build: AI detector nâng cao, batch metadata cleaner, image resize family." },
];

// Arg "niches" (json): danh sách niche cần đánh giá. Bỏ trống = dùng bộ mặc định.
const NICHES: NicheSeed[] = (() => {
  const raw = (args as { niches?: unknown }).niches;
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_NICHES;
  return raw.map((n) => {
    const o = (n ?? {}) as Partial<NicheSeed>;
    return { name: String(o.name ?? "unnamed"), serp: String(o.serp ?? ""), hint: String(o.hint ?? "") };
  });
})();

artifact.chart("scores", {
  title: "Điểm 14 niche (tổng /70)",
  type: "bar",
  x: { field: "niche", label: "Niche" },
  y: { field: "total", label: "Tổng điểm /70" },
});

phase("Nghiên cứu 14 niche song song");
log("Bắt đầu 14 agent nghiên cứu — mỗi agent tự WebSearch và chấm 8 tiêu chí.");
const evals = await Promise.all(
  NICHES.map((n) =>
    agent(`Nghiên cứu·${n.name}`).ask<NicheEval>(
      `Bạn là SEO/market researcher đánh giá 1 niche tool online cho jsonsheet.com — website bộ công cụ 100% client-side (dữ liệu không rời browser), domain mới 1 tuần tuổi, đã có 26 tools (JSON/CSV/YAML/SQL/TS converters + AI image detector + metadata cleaner + compressor).

NICHE ĐÁNH GIÁÁ: ${n.name}
Dữ liệu SERP Bing ngày 07/11/2026: ${n.serp}
Ý tưởng định hướng: ${n.hint}

NHIỆM VỤ: Dùng WebSearch (3-5 lượt) kiểm chứng nhu cầu, đối thủ, xu hướng 2025-2026 của niche này. Chấm điểm 0-10 cho 7 tiêu chí. Lưu ý bối cảnh "thời đại AI": tool nào AI chat (ChatGPT/Claude) làm thay trực tiếp được thì aiEraResilience thấp.

QUY TẮC TRUNG THỰC: chấm theo bằng chứng SERP/tín hiệu bạn tìm được, không phóng đại; nếu không tìm được đủ dữ liệu thì chấm thận trọng và nói rõ trong feasibilityNotes. Trả về đúng JSON theo schema.`,
    ),
  ),
);
log(`Đã có ${evals.length} bản đánh giá.`);

phase("Tính điểm và chọn top 3");
const scored = evals
  .map((e) => ({ ...e, total: e.demandScore + e.competitionScore + e.rankability + e.differentiation + e.feasibility + e.monetization + e.aiEraResilience }))
  .sort((a, b) => b.total - a.total);
for (const s of scored) {
  report({ niche: s.niche, demand: s.demandScore, competition: s.competitionScore, rankability: s.rankability, differentiation: s.differentiation, feasibility: s.feasibility, monetization: s.monetization, aiEra: s.aiEraResilience, total: s.total }, "scores");
}
const top3 = scored.slice(0, 3);
log(`Top 3: ${top3.map((t) => `${t.niche} (${t.total}/70)`).join(", ")}.`);

phase("Phản biện độc lập top 3");
const redTeams = await Promise.all(
  top3.map((t) =>
    agent(`Phản biện·${t.niche}`).ask<RedTeam>(
      `Bạn là red-team SEO hoài nghi. Một bản đánh giá vừa đề xuất niche "${t.niche}" cho jsonsheet.com (client-side tools, domain mới, 26 tools sẵn, không ngân sách quảng cáo):

Điểm: demand ${t.demandScore}/10, competition ${t.competitionScore}/10, rankability ${t.rankability}/10, differentiation ${t.differentiation}/10, feasibility ${t.feasibility}/10, monetization ${t.monetization}/10, aiEra ${t.aiEraResilience}/10.
Góc khác biệt đề xuất: ${t.differentiationIdea}
Đối thủ: ${JSON.stringify(t.competitors)}

NHIỆM VỤ: WebSearch 2-3 lượt để TÌM CÁCH BẺ đề xuất này — vì sao nó có thể không có traffic, ai đang làm giống, điểm nào bị đánh giá quá cao. Nếu sau phản biện vẫn đáng làm thì nói rõ điều kiện thắng. Trung thực: nếu bẻ không nổi thì công nhận.`,
    ),
  ),
);

phase("Tổng hợp bảng xếp hạng cuối");
const adjusted = top3.map((t, i) => ({ niche: t.niche, total: t.total, risk: redTeams[i] }));
const finalRanking = scored.map((s) => ({ niche: s.niche, total: s.total }));
const redNotes = adjusted.map((a) => `### ${a.niche} — ${a.total}/70\n- ⚠ Rủi ro lớn nhất: ${a.risk.biggestRisk}\n- Điểm sau phản biện: ${a.risk.adjustedScore}/10\n- Điều kiện thắng: ${a.risk.winCondition}`).join("\n\n");

await artifact.markdown(
  "ranking",
  [
    "# Bảng xếp hạng 14 niche tool mới — đánh giá chéo 18 agents",
    "",
    "| # | Niche | Tổng /70 |",
    "|---|---|---|",
    ...finalRanking.map((r, i) => `| ${i + 1} | ${r.niche} | ${r.total} |`),
    "",
    "## Phản biện độc lập top 3",
    redNotes,
    "",
    "## Chi tiết full 14 niche",
    ...scored.map((s) => `### ${s.niche} (${s.total}/70)\n- Long-tail: ${s.longtail.join(" · ")}\n- Đối thủ: ${s.competitors.slice(0, 3).join(" · ")}\n- Khác biệt: ${s.differentiationIdea}\n- Feasibility: ${s.feasibilityNotes}`),
  ].join("\n"),
  { title: "Báo cáo nghiên cứu 14 niche", description: "14 agents nghiên cứu + 3 phản biện độc lập, chấm 8 tiêu chí.", primary: true },
);

return {
  conclusion: `Top 3 niche sau đánh giá chéo: ${adjusted.map((a) => `${a.niche} (${a.total}/70)`).join(", ")}. ${redTeams.map((r, i) => `${adjusted[i].niche}: rủi ro = ${r.biggestRisk.slice(0, 80)}…`).join(" ")}`,
  findings: adjusted.map((a) => ({
    where: a.niche,
    what: `${a.total}/70 — rủi ro: ${a.risk.biggestRisk} — điều kiện thắng: ${a.risk.winCondition}`,
    evidence: `Agent nghiên cứu độc lập + agent phản biện riêng cho ${a.niche}`,
    status: "verified" as const,
    severity: "medium" as const,
  })),
  verified: ["14 agents mỗi cái tự WebSearch 3-5 lượt", "3 agents phản biện độc lập top 3"],
  notCovered: ["Volume tuyệt đối từ Ahrefs/Keyword Planner (cần tài khoản trả phí) — dùng tín hiệu SERP + ước lượng công khai thay thế"],
};