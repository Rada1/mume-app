/**
 * @file mumeCommandCatalog.ts
 * @description Catalog and matching helpers for MUME command-bar suggestions.
 */

// --- Catalog Section ---

const COMMAND_ROWS = `
! ' , - ? a(ssist) ab(andon) ac(count) accu(se) ach(ievements) act(s) ad(monish) ado(re) ag(ree) al(ias) ap(ologise) app(laud) appr(eciate) ask
b(ackstab) bab(ble) bad(ger) ban(dage) bans(ite) bas(h) be(ckon) bee(p) beg bi(te) bl(ink) bla(me) ble(ed) blo(w) blu(sh) bo(unce) boa(rd) bog(gle) bon(k) bor(ed) bow br(ag) bri(be) bu(y) bug bui(ld) bur(p) burn burr(ow) bury but(cher)
c(ast) cac(kle) cal(l) cam(p) cat(chup) ch(uckle) cha(nge) char(ge) che(er) cho(ke) chop cl(ose) cla(p) cli(mb) co(mfort) comb comm(ent) comp(are) compl(ain) con(sider) coo(k) cou(gh) cov(er) cr(y) cri(nge) cru(sh) cu(ddle) cur(tsey) cur(tsy) curs(e) cut
d(own) da(nce) dar(e) day(dream) de(mand) dec(apitate) di(sengage) dic(tionary) dim disa(gree) dism(ount) disma(ntle) dr(ink) dra(w) drag drai(n) dro(p) droo(l) du(ck)
e(ast) eat ed(it) em(ote) emb(race) embe(d) emp(ty) en(ter) eq(uipment) es(cape) ex(its) exa(mine)
f(lee) fa(rt) fai(nt) fi(ll) fla(me) flex fli(p) flu(sh) fo(llow) for(give) fora(ge) forw(ard) fr(own) fre(nch) frol(ic) fu(me)
g(et) ga(sp) ges(ture) gi(ggle) giv(e) gl(are) gr(oup) gri(n) groa(n) grov(el) grow(l) gru(mble)
h(ide) ha(ng) he(lp) her(blores) hic(cup) hin(ts) his(tory) hit hk(iss) ho(wl) hol(d) hop hu(g) hum
i(nventory) id(ea) ig(nore) inf(o) inn(ocent) ins(ult)
j(ustice)
k(ill) ke(ep) kic(k) kis(s) kn(ock)
l(ook) la(ugh) lab(el) lag le(ad) lear(n) leav(e) lev(els) li(st) lic(k) lig(ht) lin(k) liste(n) loa(d) loc(k) lov(e)
m(ap) mar(k) mas(sage) me(tamorph) men(d) mer(ge) mi(x) mil(k) min(e) mo(an) mu(tter)
n(orth) na(rrate) ne(ws) ni(bble) nod nu(zzle)
o(pen) of(fer) or(der)
p(ut) pa(t) pac(e) pe(er) pi(ck) pit(y) po(ur) poi(son) poin(t) pok(e) pon(der) pout pr(actice) pray pro(tect) puk(e) pul(l) pun(ch) purr pur(sue) puz(zled)
q(uests) qua(ff) qui quit
r(est) ra(ise) rea(d) reb(orn) rec(ite) reco(ver) rel(ieve) rem(ove) ren(t) rep(ly) repo(rt) resc(ue) rese(t) ret(urn) rev(eal) ri(de) ro(ar) rol(l) ru(ffle)
s(outh) sa(y) sad(dle) sal(ute) sc(ore) sca(lp) scou(t) scr(eam) se(ll) sea(rch) sh(oot) sha(ke) she(athe) shi(ver) shou(t) shr(ug) si(gh) sin(g) sip sit sl(eep) sla(p) sm(ile) smir(k) smo(ke) sn(uggle) sna(rl) snap sne(eze) snea(k) sni(cker) snif(f) snig(ger) sno(re) snow(ball) snuf(f) sob sp(it) spa(nk) sq(ueeze) st(and) stag(ger) star(e) stat ste(al) sto(mp) str(ut) su(lk) sug(gest) sw(im) sy(mpathize)
t(ell) ta(ste) tac(kle) tai(l) tak(e) tap tau(nt) tea(ch) teas(e) th(reaten) tha(nk) thi(nk) thro(w) thu(mbs) ti(me) tic(kle) tie til(t) tip tr(ack) trai(n) tro(phy) tw(iddle) ty(po)
u(p) un(lock) unc(over) unk(eep) unloa(d) unm(ark) uns(addle) us(e)
v(alue) vi(ew)
w(est) wa(ke) wat(ch) wav(e) wea(r) weat(her) wh(o) whe(re) whet whi(sper) whin(e) whist(le) whoi(s) wi(eld) wig(gle) win(k) wo(rship) wr(ite)
y(awn) ye(ll) yo(del)
`;

// --- Type Section ---

export interface MumeCommandEntry {
    display: string;
    minimum: string;
    full: string;
}

export interface MumeCommandMatch {
    entry: MumeCommandEntry | null;
    suggestions: MumeCommandEntry[];
    token: string;
    suffix: string;
    isValid: boolean;
}

// --- Logic Section ---

const parseCommandEntry = (display: string): MumeCommandEntry => {
    const match = /^([^()]+)\(([^()]+)\)$/.exec(display);
    if (!match) {
        return { display, minimum: display.toLowerCase(), full: display.toLowerCase() };
    }

    const minimum = match[1].toLowerCase();
    const full = `${match[1]}${match[2]}`.toLowerCase();
    return { display, minimum, full };
};

export const MUME_COMMANDS: MumeCommandEntry[] = COMMAND_ROWS
    .trim()
    .split(/\s+/)
    .map(parseCommandEntry);

const tokenCanLeadToEntry = (token: string, entry: MumeCommandEntry): boolean => {
    if (!token) return false;
    return entry.full.startsWith(token);
};

const tokenExecutesEntry = (token: string, entry: MumeCommandEntry): boolean => {
    if (!token) return false;
    if (!/^[a-z]/i.test(entry.full)) return token === entry.full;
    return token.length >= entry.minimum.length && entry.full.startsWith(token);
};

export const getMumeCommandMatch = (input: string, limit = 8): MumeCommandMatch => {
    const leadingTrimmed = input.trimStart();
    const tokenMatch = /^(\S+)([\s\S]*)$/.exec(leadingTrimmed);
    const token = tokenMatch?.[1].toLowerCase() ?? '';
    const suffix = tokenMatch?.[2] ?? '';

    if (!token) {
        return { entry: null, suggestions: [], token: '', suffix: '', isValid: false };
    }

    const suggestions = MUME_COMMANDS
        .filter(entry => tokenCanLeadToEntry(token, entry))
        .slice(0, limit);
    const entry = suggestions.find(candidate => tokenExecutesEntry(token, candidate)) ?? null;

    return {
        entry,
        suggestions,
        token,
        suffix,
        isValid: entry !== null
    };
};

export const replaceMumeCommandToken = (input: string, entry: MumeCommandEntry): string => {
    const leadingWhitespace = input.match(/^\s*/)?.[0] ?? '';
    const leadingTrimmed = input.trimStart();
    const suffix = leadingTrimmed.replace(/^\S+/, '');
    return `${leadingWhitespace}${entry.full}${suffix || ' '}`;
};
