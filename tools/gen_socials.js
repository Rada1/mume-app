
const text = `
accu(se)      che(er)     for(give)   lov(e)     scr(eam)    str(ut)
ad(monish)    cho(ke)     fr(own)     mas(sage)  sha(ke)     su(lk)
ado(re)       cla(p)      fre(nch)    mo(an)     shi(ver)    sy(mpathize)
ag(ree)       co(mfort)   frol(ic)    mu(tter)   shr(ug)     tac(kle)
ap(ologise)   comb        fu(me)      ni(bble)   si(gh)      tap
app(laud)     cou(gh)     ga(sp)      nod        sin(g)      tau(nt)
appr(eciate)  cr(y)       ges(ture)   nu(zzle)   sla(p)      teas(e)
bab(ble)      cri(nge)    gi(ggle)    pa(t)      sm(ile)     th(reaten)
bad(ger)      cu(ddle)    gl(are)     pac(e)     smir(k)     tha(nk)
be(ckon)      cur(tsey)   gri(n)      pe(er)     sn(uggle)   thi(nk)
beg           cur(tsy)    groa(n)     pit(y)     sna(rl)     thu(mbs)
bi(te)        curs(e)     grov(el)    poin(t)    snap        tic(kle)
bl(ink)       da(nce)     grow(l)     pok(e)     sne(eze)    til(t)
bla(me)       dar(e)      gru(mble)   pon(der)   sni(cker)   tip
ble(ed)       day(dream)  hic(cup)    pout       snif(f)     tw(iddle)
blu(sh)       de(mand)    hk(iss)     puk(e)     snig(ger)   wav(e)
bo(unce)      disa(gree)  ho(wl)      pun(ch)    sno(re)     whin(e)
bog(gle)      droo(l)     hop         purr       snow(ball)  whist(le)
bon(k)        du(ck)      hu(g)       puz(zled)  sob         wig(gle)
bor(ed)       emb(race)   hum         ra(ise)    sp(it)      win(k)
bow           fa(rt)      inn(ocent)  rel(ieve)  spa(nk)     wo(rship)
br(ag)        fai(nt)     ins(ult)    ro(ar)     sq(ueeze)   y(awn)
bur(p)        fla(me)     kis(s)      rol(l)     stag(ger)   yo(del)
cac(kle)      flex        la(ugh)     ru(ffle)   star(e)     
ch(uckle)     fli(p)      lic(k)      sal(ute)   sto(mp)     
`;

const commands = text.match(/\S+/g);
const cols = 6;
const spacingX = 15.5;
const spacingY = 4.2;
const startX = 4;
const startY = 8;

const result = commands.map((raw, i) => {
    const cmd = raw.replace(/[()]/g, '');
    let label = cmd.charAt(0).toUpperCase() + cmd.slice(1);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * spacingX;
    const y = startY + row * spacingY;

    return `    { "id": "soc-${cmd}", "label": "${label}", "command": "${cmd}", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": ${x.toFixed(1)}, "y": ${y.toFixed(1)}, "w": 90, "h": 35, "backgroundColor": "#8b5cf6", "shape": "rect" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },`;
});

// Add a BACK button to the end
result.push(`    { "id": "soc-back", "label": "BACK", "command": "main", "setId": "social list", "actionType": "nav", "display": "floating", "style": { "x": 80, "y": 92, "w": 100, "h": 40, "backgroundColor": "#334155", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },`);

console.log(result.join('\n'));
