c=1.047,cs=1.107,d=1.174,ds=1.243,e=1.318,f=1.389,fs=1.476,g=1.568,gs=1.655,a=1.754,as=1.857,b=1.977,
A=[b,b,b,d*2,g,g,fs,as],
B=[2,3.185,4,2,3.185,4,2,3.185],
(t&7)||(S=random()*128&64),
(t&3)||(H=random()*128&64),
t||(hf=lf=0),
T=t*1.1,
BEAT=T>>15,
BAR=T>>18,
D=(T>>10&3),
hP=6,
lP=4,

O = (
(D||((BEAT&7)<7)||(BAR!=0&&BAR!=3)?null:H)??(BAR?(D?null:this['SHH SH HS H SHHH'[T>>12&15]]):null)??
((t*A[BEAT&7] * ((BEAT&7) == 7 ? B : '23423423')[T>>12&7]*(BAR>3?2**(t>>1&3):1)&1023) < (BAR>3?512:256-
(T>>4&255)) && 64)
),
hf=O*(1/hP)+hf*((hP-1)/hP),
lf=(O-hf)*(1/lP)+lf*((lP-1)/lP),
[O+128-32,lf+128][1] // Change 1 to 0 to disable filters