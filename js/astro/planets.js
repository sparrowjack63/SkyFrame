// js/astro/planets.js — Calculs de positions planétaires (Meeus simplifié)

const _planetCache={};

function planetRaDec(planet,jdv){
  const T=(jdv-2451545.0)/36525.0;
  const EL={
    Mars:    {a:1.523679,e0:0.09340065,e1:9.0484e-5,  ii:1.84973,Om:49.5581, w0:286.5016,w1:1.0697, M0:19.373, L1:19141.6964353},
    Jupiter: {a:5.202561,e0:0.04849485,e1:1.63244e-4, ii:1.30327,Om:100.4542,w0:14.7539, w1:0.83776,M0:20.924, L1:3034.9057},
    Saturn:  {a:9.554747,e0:0.05550825,e1:-3.46641e-4,ii:2.48888,Om:113.6634,w0:92.4302, w1:0.39521,M0:316.967,L1:1222.1138},
  };
  const p=EL[planet]; if(!p) return {ra:0,dec:0};
  const Md=(p.M0+p.L1*T/100)%360, M=toR(Md), e=p.e0+p.e1*T;
  const EC=(2*e-e*e*e/4)*Math.sin(M)+5/4*e*e*Math.sin(2*M)+13/12*e*e*e*Math.sin(3*M);
  const v=Md+toD(EC), Lp=(v+p.w0+p.w1*T/100)%360;
  const r=p.a*(1-e*e)/(1+e*Math.cos(toR(v)));
  const Om=p.Om,ii=p.ii;
  const x=r*(Math.cos(toR(Om))*Math.cos(toR(Lp-Om))-Math.sin(toR(Om))*Math.sin(toR(Lp-Om))*Math.cos(toR(ii)));
  const y=r*(Math.sin(toR(Om))*Math.cos(toR(Lp-Om))+Math.cos(toR(Om))*Math.sin(toR(Lp-Om))*Math.cos(toR(ii)));
  const z=r*Math.sin(toR(Lp-Om))*Math.sin(toR(ii));
  const Me=toR((357.52911+35999.05029*T)%360),ee=0.016708634-0.000042037*T;
  let Ee=Me; for(let i=0;i<6;i++) Ee=Me+ee*Math.sin(Ee);
  const xe=Math.cos(Ee)-ee, ye=Math.sqrt(1-ee*ee)*Math.sin(Ee);
  const Ls=toD(Math.atan2(ye,xe))+(282.93768+1.7195366*T);
  const re=Math.sqrt(xe*xe+ye*ye);
  const xE=re*Math.cos(toR(Ls)), yE=re*Math.sin(toR(Ls));
  const dx=x-xE, dy=y-yE, dz=z;
  const lam=toD(Math.atan2(dy,dx)), bet=toD(Math.asin(dz/Math.sqrt(dx*dx+dy*dy+dz*dz)));
  const eps=23.439291111-0.013004167*T;
  const ra=((toD(Math.atan2(Math.sin(toR(lam))*Math.cos(toR(eps))-Math.tan(toR(bet))*Math.sin(toR(eps)),Math.cos(toR(lam)))))%360+360)%360;
  const dec=toD(Math.asin(Math.sin(toR(bet))*Math.cos(toR(eps))+Math.cos(toR(bet))*Math.sin(toR(eps))*Math.sin(toR(lam))));
  return {ra,dec};
}

function getPlanetObj(name,t){
  const jdv=jd(t), pos=planetRaDec(name,jdv);
  const ld=lst(jdv,S.lon);
  const{alt,az}=altaz(pos.ra,pos.dec,ld,S.lat);
  return {...PLANETS_META[name],ra:pos.ra,dec:pos.dec,alt,az,acc:isAcc(alt,az)};
}
