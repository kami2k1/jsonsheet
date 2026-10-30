/**
 * Converter unit tests — run with: npm test
 * Plain assertions, no framework needed at this stage.
 */
import {
  jsonToCsv, csvToJson, jsonToMarkdown, markdownToCsv, csvToMarkdown,
  jsonToTs, csvToSql, jsonToSql, formatJson, tsvToJson, csvDedupe, csvTranspose, fixAiOutput,
} from '../src/lib/converters';
import { parseCsv, serializeCsv } from '../src/lib/csv';

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

console.log('— csv parser —');
{
  const rows = parseCsv('a,b\n"x,y",2\n');
  check('basic rows', JSON.stringify(rows) === JSON.stringify([['a', 'b'], ['x,y', '2']]));
  const q = parseCsv('"say ""hi""","line\nbreak"', {});
  check('escaped quotes + newline in field', JSON.stringify(q) === JSON.stringify([['say "hi"', 'line\nbreak']]));
  const semi = parseCsv('a;b\n1;2', { delimiter: ';' });
  check('semicolon delimiter', semi[0][1] === 'b');
  const ser = serializeCsv([['a,b', 'plain', 3, null]]);
  check('serializer quotes when needed', ser.includes('"a,b"') && ser.includes('plain'));
}

console.log('— fixAiOutput —');
{
  check('strips json fence', fixAiOutput('```json\n{"a":1}\n```') === '{"a":1}');
  check('strips bare fence', fixAiOutput('```\n[1,2]\n```') === '[1,2]');
  check('strips leading prose', fixAiOutput('Here is your JSON:\n{"a":1}') === '{"a":1}');
  check('plain csv untouched', fixAiOutput('a,b\n1,2') === 'a,b\n1,2');
}

console.log('— jsonToCsv —');
{
  const r = jsonToCsv('[{"a":1,"b":"x,y"},{"a":2,"b":null}]');
  check('array of objects', r.ok && r.output.startsWith('a,b\n1,"x,y"') && r.output.endsWith('2,\n'));
  check('null → empty cell', r.ok && r.output.includes('2,'));
  const nested = jsonToCsv('[{"u":{"n":"Ada"},"s":99}]');
  check('flatten dot notation', nested.ok && nested.output.includes('u.n'));
  const noflat = jsonToCsv('[{"u":{"n":"Ada"}}]', { flatten: false });
  check('flatten off embeds JSON text', noflat.ok && noflat.output.includes('{""n"":""Ada""}'));
  const bad = jsonToCsv('{not json}');
  check('invalid json fails with message', !bad.ok && (bad.error?.includes('JSON') ?? false));
  const single = jsonToCsv('{"name":"Ada","role":"eng"}');
  check('single object → key/value row', single.ok && single.output.includes('name,role'));
  const objOfArrays = jsonToCsv('{"ids":[1,2],"names":["a","b"]}');
  check('object of arrays → columns', objOfArrays.ok && objOfArrays.output.includes('ids,names'));
}

console.log('— csvToJson —');
{
  const r = csvToJson('id,name,active\n1,Ada,true\n2,Bo,false');
  const parsed = JSON.parse(r.ok ? r.output : '[]');
  check('types inferred', parsed[0].id === 1 && parsed[0].active === true && parsed[1].name === 'Bo');
  const strings = csvToJson('id\n007', { parseNumbers: false });
  check('no type inference', JSON.parse(strings.output ?? '{}')[0].id === '007');
  const noheader = csvToJson('1,2\n3,4', { hasHeader: false });
  check('no header → arrays', JSON.parse(noheader.output ?? '[]')[0][0] === 1);
  const big = csvToJson('id\n99999999999999999999');
  check('long numeric stays string', JSON.parse(big.output ?? '{}')[0].id === '99999999999999999999');
}

console.log('— markdown ↔ csv —');
{
  const md = jsonToMarkdown('[{"name":"Ada","score":99},{"name":"Bo","score":98}]');
  check('json→md header + separator', md.ok && md.output.includes('| name | score |') && md.output.includes('| --- | --- |'));
  const back = markdownToCsv(md.output);
  check('md→csv roundtrip', back.ok && back.output === 'name,score\nAda,99\nBo,98\n');
  const cmd = csvToMarkdown('a,b\n1,2');
  check('csv→md', cmd.ok && cmd.output.startsWith('| a | b |'));
}

console.log('— jsonToTs —');
{
  const r = jsonToTs('[{"id":1,"user":{"name":"Ada","tags":["x"]}}]', { rootName: 'person' });
  check('root type + nested interface', r.ok && r.output.includes('export type Person = PersonRow[];') && r.output.includes('export interface User {'));
  const bad = jsonToTs('nope');
  check('invalid json fails', !bad.ok);
}

console.log('— SQL generators —');
{
  const sql = csvToSql('id,name,active\n1,Ada,true\n2,"O\'Brien",false', { table: 'users', dialect: 'postgres' });
  check('create table + insert', sql.ok && sql.output.includes('CREATE TABLE "users"') && sql.output.includes("'Ada'"));
  check('quote escaping', sql.ok && sql.output.includes("'O''Brien'"));
  const my = csvToSql('flag\ntrue', { table: 't', dialect: 'mysql', createTable: false });
  check('mysql boolean + backticks', my.ok && !my.output.includes('CREATE') && my.output.includes('`t`') && my.output.includes('TRUE'));
  const jsql = jsonToSql('[{"a":1,"b":"x"},{"a":2,"b":null}]', { table: 't', createTable: true });
  check('json→sql union columns + NULL', jsql.ok && jsql.output.includes('NULL'));
}

console.log('— formatJson —');
{
  const ok = formatJson('{"b":1,"a":2}', { sortKeys: true });
  check('sort keys', ok.ok && ok.output.startsWith('{\n  "a": 2,'));
  const min = formatJson('{"a": [1, 2]}', { mode: 'minify' });
  check('minify', min.ok && min.output === '{"a":[1,2]}');
  const bad = formatJson('{"a":1,,}');
  check('error with line hint', !bad.ok && (bad.error?.includes('JSON') ?? false));
}

console.log('— tsvToJson —');
{
  const r = tsvToJson('id\tname\n1\tAda');
  check('tab parsing', r.ok && (r.output.includes('"name": "Ada"')));
}

console.log('— csv utilities —');
{
  const d = csvDedupe('a,b\n1,2\n1,2\n3,4');
  check('dedupe keeps first', d.ok && d.output === 'a,b\n1,2\n3,4\n' && (d.stats?.includes('loại bỏ 1') ?? false));
  const t = csvTranspose('name,Ada\nscore,99');
  check('transpose', t.ok && t.output === 'name,score\nAda,99\n');
}

console.log(`\n${pass} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
