import annoyance from './constant';

export function randomRude(replyToken, misuh) {
  var randomArr = Math.floor(Math.random() * misuh.length);
  reply(replyToken, misuh[randomArr]);
}

export function ganggu(rnd) {
  // const rnd = Math.random();
  var acc = 0;
  for (var i = 0, r; (r = annoyance[i]); i++) {
    acc += r.chance / 100;
    console.log(acc, rnd);
    if (rnd < acc) return r.type;
  }
  console.warn(acc, rnd);
  return;
}
