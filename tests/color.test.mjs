import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {colorFromJpeg,dominantColor,rgbToHsl} from '../scripts/color.mjs';
const hueOf=h=>rgbToHsl(parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16))[0];
test('solid red/orange cover gives a warm accent, green gives green, black gives none',{skip:!existsSync('/tmp/test_red.jpg')},()=>{
 const red=colorFromJpeg(readFileSync('/tmp/test_red.jpg')),green=colorFromJpeg(readFileSync('/tmp/test_green.jpg')),black=colorFromJpeg(readFileSync('/tmp/test_black.jpg'));
 assert.match(red,/^#[0-9a-f]{6}$/);assert.ok(hueOf(red)<30||hueOf(red)>340,'kırmızı ton: '+red);assert.ok(hueOf(green)>100&&hueOf(green)<160,'yeşil ton: '+green);assert.equal(black,null);
});
test('greys and near-black pixels never produce an accent',()=>{
 const px=[];for(let i=0;i<400;i++)px.push(120,120,120,255,5,5,5,255);assert.equal(dominantColor(new Uint8Array(px)),null);
});
test('accent is bright enough for a dark background',()=>{
 const px=[];for(let i=0;i<400;i++)px.push(90,0,0,255);const c=dominantColor(new Uint8Array(px));assert.ok(c);const l=rgbToHsl(parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16))[2];assert.ok(l>.55&&l<.7);
});

