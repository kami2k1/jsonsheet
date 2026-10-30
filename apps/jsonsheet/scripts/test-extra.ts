/**
 * Tests for batch-2 converters (YAML, flatten, escape, HTML, query string).
 * Run: npm test
 */
import { jsonToYaml, yamlToJson, flattenJson, jsonEscape, csvToHtml, jsonToQueryString, jsonToXml, jsonToJsonl, urlParamsToJson, base64Text } from '../src/lib/extra-converters';

let pass = 0;
let failCount = 0;

function check(name: string, cond: boolean, extra = ''): void {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    failCount++;
    console.error(`  ✗ ${name} ${extra}`);
  }
}

console.log('— jsonToYaml —');
{
  const r = jsonToYaml('[{"name":"Ada","tags":["math","code"],"score":99,"ok":true,"note":null}]');
  check('list of maps', r.ok && r.output.includes('- name: Ada') && r.output.includes('  tags:'));
  check('nested list', r.ok && r.output.includes('  - math'));
  check('scalars', r.ok && r.output.includes('score: 99') && r.output.includes('ok: true') && r.output.includes('note: null'));
  const special = jsonToYaml('[{"weird key": "val: ue", "n": "123", "e": ""}]');
  const specialParsed = JSON.parse(yamlToJson(special.output ?? '').output ?? '{}');
  check('ambiguous values quoted + roundtrip', special.ok && specialParsed[0]['weird key'] === 'val: ue' && specialParsed[0].n === '123' && specialParsed[0].e === '');
  const empty = jsonToYaml('{"a":[],"b":{}}');
  check('empty containers', empty.ok && empty.output.includes('a: []') && empty.output.includes('b: {}'));
  check('invalid json fails', !jsonToYaml('{bad').ok);
}

console.log('— yamlToJson —');
{
  const y = jsonToYaml('[{"name":"Ada","tags":["math","code"],"score":99.5,"ok":false,"note":null,"addr":{"city":"London"}}]');
  const back = yamlToJson(y.output);
  check('roundtrip array of maps', back.ok && back.output.includes('"name": "Ada"') && back.output.includes('"city": "London"'));
  const parsed = JSON.parse(back.ok ? back.output : '{}');
  check('types preserved', Array.isArray(parsed) && parsed[0].score === 99.5 && parsed[0].ok === false && parsed[0].note === null && parsed[0].tags.length === 2);
  const withComments = yamlToJson('# top comment\nname: Ada # inline\nage: 30');
  check('comments stripped', withComments.ok && JSON.parse(withComments.output ?? '{}').name === 'Ada' && JSON.parse(withComments.output ?? '{}').age === 30);
  const flow = yamlToJson('tags: [a, b]\nmeta: {x: 1, y: two}');
  check('flow style', flow.ok && JSON.stringify(JSON.parse(flow.output ?? '{}')) === '{"tags":["a","b"],"meta":{"x":1,"y":"two"}}');
  const nestedList = yamlToJson('items:\n  - a\n  - b');
  check('nested sequence', nestedList.ok && JSON.stringify(JSON.parse(nestedList.output ?? '{}')) === '{"items":["a","b"]}');
  const lom = yamlToJson('users:\n  - name: Ada\n    age: 30\n  - name: Bo\n    age: 40');
  const lomParsed = JSON.parse(loM(lom));
  check('list of maps under key', lomParsed.users.length === 2 && lomParsed.users[1].name === 'Bo' && lomParsed.users[0].age === 30);
  check('invalid yaml fails', !yamlToJson('a: [\nbroken').ok);
}
// helper to keep the two checks above terse
function loM(r: { ok: boolean; output: string }): string {
  return r.output ?? '{}';
}

console.log('— flattenJson —');
{
  const flat = flattenJson('{"user":{"name":"Ada","tags":["x","y"]},"top":true}');
  const parsed = JSON.parse(flat.ok ? flat.output : '{}');
  check('flatten dot notation', parsed['user.name'] === 'Ada' && parsed['user.tags.0'] === 'x' && parsed['top'] === true);
  const un = flattenJson(flat.output ?? '{}', { mode: 'unflatten' });
  const uparsed = JSON.parse(un.ok ? un.output : '{}');
  check('unflatten restores', uparsed.user.name === 'Ada' && uparsed.user.tags[1] === 'y' && uparsed.top === true);
  check('unflatten invalid input fails', !flattenJson('[1,2]', { mode: 'unflatten' }).ok);
}

console.log('— jsonEscape —');
{
  const esc = jsonEscape('He said "hi"\nline2\ttab');
  check('escape', esc.ok && esc.output === '"He said \\"hi\\"\\nline2\\ttab"');
  const un = jsonEscape(esc.output ?? '', { mode: 'unescape' });
  check('unescape roundtrip', un.ok && un.output === 'He said "hi"\nline2\ttab');
  const bare = jsonEscape('a\\nb', { mode: 'unescape' });
  check('unescape bare string', bare.ok && bare.output === 'a\nb');
}

console.log('— csvToHtml —');
{
  const r = csvToHtml('name,note\nAda,"<b>& Co"\nBo,x');
  check('thead + tbody', r.ok && r.output.includes('<th>name</th>') && r.output.includes('<th>note</th>') && r.output.includes('<tbody>'));
  check('HTML escaping', r.ok && r.output.includes('&lt;b&gt;&amp; Co'));
  const noHeader = csvToHtml('a,b\n1,2', { hasHeader: false });
  check('no header mode', noHeader.ok && !noHeader.output.includes('<thead>'));
  const cls = csvToHtml('a\n1', { cssClass: 'tbl x' });
  check('class attr escaped', cls.ok && cls.output.includes('class="tbl x"'));
}

console.log('— jsonToQueryString —');
{
  const r = jsonToQueryString('{"q":"hello world","page":2,"tags":["a","b"],"meta":{"x":1}}');
  check('encode + arrays + nested', r.ok && r.output.includes('q=hello%20world') && r.output.includes('tags=a&tags=b') && r.output.includes('meta=%7B%22x%22%3A1%7D'));
  const sorted = jsonToQueryString('{"b":2,"a":1}', { sortKeys: true });
  check('sortKeys', sorted.ok && sorted.output.startsWith('a=1&b=2'));
  check('invalid input fails', !jsonToQueryString('{bad').ok);
}

console.log('— jsonToXml —');
{
  const r = jsonToXml('[{"name":"Ada","role":null},{"name":"Bo"}]');
  check('repeated items + null self-closing', r.ok && r.output.includes('<item>') && r.output.includes('<role />') && r.output.includes('<name>Ada</name>'));
  const esc = jsonToXml('{"t":"a<b&c>"}');
  check('XML escaping', esc.ok && esc.output.includes('a&lt;b&amp;c&gt;'));
  const dirty = jsonToXml('{"2bad key!":"v"}');
  check('key sanitized', dirty.ok && dirty.output.includes('<_2bad_key_>v</_2bad_key_>'));
  const custom = jsonToXml('{"a":1}', { rootName: 'data' });
  check('custom root', custom.ok && custom.output.includes('<data>') && custom.output.includes('</data>'));
  check('invalid json fails', !jsonToXml('{bad').ok);
}

console.log('— jsonToJsonl —');
{
  const r = jsonToJsonl('[{"a":1},{"a":2}]');
  check('one object per line', r.ok && r.output === '{"a":1}\n{"a":2}\n');
  const single = jsonToJsonl('{"x":[1,2]}');
  check('single object', single.ok && single.output.trim() === '{"x":[1,2]}');
  check('invalid fails', !jsonToJsonl('{bad').ok);
}

console.log('— urlParamsToJson —');
{
  const r = urlParamsToJson('a=1&name=Ada%20Lovelace&flag=true&tag=x&tag=y');
  const parsed = JSON.parse(r.ok ? r.output : '{}');
  check('types + decode + repeated keys', parsed.a === 1 && parsed.name === 'Ada Lovelace' && parsed.flag === true && Array.isArray(parsed.tag) && parsed.tag.length === 2);
  const plus = urlParamsToJson('q=hello+world');
  check('+ decoded as space', JSON.parse(plus.output ?? '{}').q === 'hello world');
  const raw = urlParamsToJson('n=007', { parseNumbers: false });
  check('no type inference', JSON.parse(raw.output ?? '{}').n === '007');
  check('empty fails', !urlParamsToJson('').ok);
}

console.log('— base64Text —');
{
  const enc = base64Text('Hello world');
  check('ASCII encode', enc.ok && enc.output === 'SGVsbG8gd29ybGQ=');
  const dec = base64Text(enc.output ?? '', { mode: 'decode' });
  check('decode roundtrip', dec.ok && dec.output === 'Hello world');
  check('invalid base64 fails', !base64Text('!!!not-base64!!!', { mode: 'decode' }).ok);
  const multiline = base64Text('line1\nline2');
  check('newlines encoded', multiline.ok && base64Text(multiline.output ?? '', { mode: 'decode' }).output === 'line1\nline2');
}

console.log(`\n${pass} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
