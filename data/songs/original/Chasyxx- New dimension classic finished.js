wv=function(t){return y=t%256,y<127?y:2*(256-y)},ms=int(t/1e4),p=t/1e4%16,b=p%4,qn=p%1,
rh=function(t){for(m=0,i=0;i<t.length;i++)b>t[i]&&(m=b-t[i]);return m},
sc=ms%256<32?1:min(1,max(0,3*qn-.3))*(ms%32>0),
c=t*(p<12?2:2.4),
//                                                    VVVV Music code VVVV

max(0,min(255,sc*(wv((t/32)-(
((t/2+qn*(t*(ms>>2&15))+(2*t*(1+(ms>>5&3)))))&64)*1.5)*(1-rh([0,1,1.5,2,2.75,3.5]))*(ms%256>63)-
(t/2+(3*pow(7-qn*(2+(ms>>2&3))%1,5))&128)*(ms%64>47)+(((
(wv(c)-128)*2)+128)))-qn*pow(1-qn*(ms%128<80?2:4)%1,4)*80*random()*(ms%256>63)+wv(2*t+60*sin(25*b))*(ms%256>31)*(ms%32<1)+wv(2e3*pow(1-qn,9))*(ms%256>31)+128))/*,min(wv(t*2)*2,255)*/
// A NEW DIMENSION: THE CLASSIC VERSION