/**
 * Subtitle toolkit tests — run with: npm test
 */
import {
  parseSRT, parseVTT, toSRT, toVTT, shiftCues, cuesToText, cuesToCsv, cuesToJson,
  detectSubtitleFormat, parseTimestamp,
} from '../src/lib/subtitles';

let pass = 0;
let failCount = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { failCount++; console.error(`  ✗ ${name} ${extra}`); }
}

const SAMPLE_SRT = `\uFEFF1
00:00:01,000 --> 00:00:04,200
Hello <i>world</i>
second line

2
00:00:05,500 --> 00:00:07,000
Subtitles rock!

3
00:00:07,000 --> 00:00:09,000
Subtitles rock!`;

console.log('— parseSRT —');
{
  const cues = parseSRT(SAMPLE_SRT);
  check('3 cues parsed', cues.length === 3);
  check('start seconds', cues[0].start === 1);
  check('end with comma ms', cues[0].end === 4.2);
  check('multiline text kept', cues[0].text === 'Hello <i>world</i>\nsecond line');
  const noBom = parseSRT(SAMPLE_SRT.replace('\uFEFF', ''));
  check('works without BOM', noBom.length === 3);
  const malformed = parseSRT('garbage\n\n00:0x:01,000 --> bad\n\n1\n00:00:02,000 --> 00:00:03,000\nok');
  check('malformed cues skipped', malformed.length === 1 && malformed[0].text === 'ok');
}

console.log('— parseVTT —');
{
  const vtt = `WEBVTT

NOTE this is a comment

intro
00:00.500 --> 00:02.000
Hi there

00:00:05.000 --> 00:00:06.500
Bye`;
  const cues = parseVTT(vtt);
  check('WEBVTT header + NOTE skipped', cues.length === 2);
  check('MM:SS.mmm parsed', cues[0].start === 0.5 && cues[0].end === 2);
  check('cue id line skipped', cues[0].text === 'Hi there');
}

console.log('— roundtrips —');
{
  const cues = parseSRT(SAMPLE_SRT);
  const vtt = toVTT(cues);
  check('toVTT header + dot format', vtt.startsWith('WEBVTT\n') && vtt.includes('00:00:01.000 --> 00:00:04.200'));
  const back = parseVTT(vtt);
  check('vtt roundtrip same cues', back.length === 3 && back[1].start === 5.5);
  const srt2 = toSRT(back);
  const back2 = parseSRT(srt2);
  check('srt roundtrip', back2.length === 3 && back2[2].start === 7 && back2[2].text === 'Subtitles rock!');
}

console.log('— detectSubtitleFormat —');
{
  check('detects srt', detectSubtitleFormat(SAMPLE_SRT) === 'srt');
  check('detects vtt', detectSubtitleFormat('WEBVTT\n\n00:00.000 --> 00:01.000\nx') === 'vtt');
  check('unknown on junk', detectSubtitleFormat('nothing here') === 'unknown');
  check('parseTimestamp MM:SS.mmm', parseTimestamp('01:02.500') === 62.5);
}

console.log('— shiftCues —');
{
  const cues = parseSRT(SAMPLE_SRT).slice(0, 1);
  const shifted = shiftCues(cues, 2.5);
  check('positive shift', shifted[0].start === 3.5 && shifted[0].end === 6.7);
  const early = shiftCues(cues, -5);
  check('clamped at 0', early[0].start === 0 && early[0].end === 0);
}

console.log('— cuesToText —');
{
  const cues = parseSRT(SAMPLE_SRT);
  const text = cuesToText(cues);
  check('tags stripped + deduped', text === 'Hello world\nsecond line\nSubtitles rock!\n');
  const withDup = cuesToText(cues, false);
  check('dedupe off keeps repeat', withDup.split('\n').filter((l) => l === 'Subtitles rock!').length === 2);
}

console.log('— cuesToCsv / cuesToJson (ecosystem bridge) —');
{
  const cues = parseSRT(SAMPLE_SRT).slice(0, 2);
  const csv = cuesToCsv(cues);
  check('csv header + rows', csv.includes('start_seconds,end_seconds,duration_seconds,text') && csv.includes('1,4.2,3.2'));
  check('csv escapes comma in text', cuesToCsv(parseSRT('1\n00:00:01,000 --> 00:00:02,000\n"quoted", text')).includes('"""quoted"", text'));
  const json = JSON.parse(cuesToJson(cues));
  check('json structure', Array.isArray(json) && json[0].start === 1 && json[0].duration === 3.2 && json[0].text.includes('second line'));
}

console.log(`\n${pass} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
