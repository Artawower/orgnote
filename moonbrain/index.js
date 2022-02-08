import { parse } from 'uniorg-parse/lib/parser.js';
import { toVFile } from 'to-vfile';


function documentToStruct(doc) {

}

console.log(parse(toVFile.readSync("./miscellaneous/test1.org")))

console.log(parse)
