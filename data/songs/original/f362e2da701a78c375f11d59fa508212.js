// Should work with "Convolutional reverb" if you manage to put it in. (this.KER??=unescape(escape`(insert the really long kernel string, either one)`.replace(/u40(..)/g,"$1")).split('').map((z)=>(c=z.charCodeAt(0))-127)), then use KER as the kernel
BB=t=>(c=1.047,cs=1.107,d=1.174,ds=1.243,e=1.318,f=1.389,fs=1.476,g=1.568,gs=1.655,a=1.754,as=1.857,b=1.977,

T=t*1.10,BAR=T>>15,BAR2=T/(1<<15),

(t&65535)||(
drumpat="SHH0SH0HS0H0SHHH",
inst='011100100010101111011010011000000',
l1='23423423',
l2=[b,b,b,d*2,g,g,fs,as],
l3=[2,3.185,4,2,3.185,4,2,3.185],
snare1=0,
snare2=0
),

clam=(x)=>(min(1,max(0,x))),

snare1=(((snare1*31)+random())/32),S1=((snare1)*4)>2,
snare2=(((snare2*31)+random())/32),S2=((snare2)*4)>2,

S=BAR>31?random():S1,
H=BAR>31?((sin(t/5)+1)/2):((t>>4)*PI)&1,

rollin=(BAR>7?0:clam(BAR2-7)*S*128)|(BAR>31?0:clam(BAR2-31)*S*128),

drum1=drumpat[T>>12&15],
drum=(drum1=='S'?S:drum1=='H'?H:drum1)*(256-((T>>4)&255))/2,

A=t*l1[T>>12&7],
B=t*l3[T>>12&7],
lead=(x,y)=>(inst[[A,A,A,A,A,A,A,B][T>>15&7]*l2[BAR&7]>>x&31]*y),
superlead=(lead(6,64)+lead(5,32)+lead(4,16)+lead(3,8)+lead(2,4)+lead(1,2)+lead(0,1)),

(
	BAR>31?superlead:lead(6,64)
)+(rollin?rollin:(BAR>7?drum:0))
),

this.convData ??= [], // need this
convData.i=0,

CONV=(Z,KERNEL=[1,1,1,1,1])=>{
	this.convData[convData.i] ??= {}; // need this
	convData[convData.i].d ??= { l: KERNEL.length, m: max(1,abs(KERNEL.reduce((a,v)=>a+v))) } ;
	convData[convData.i].k ??= {a: KERNEL.slice().reverse(), b: KERNEL.slice().map(v=>-v).reverse()}
	convData[convData.i].a??=Array.from(KERNEL,_=>0);
	convData[convData.i].b??=0;
	Z&=255; // Somehow this one line severely optimizes the code (it's much slower without.) At least have Z=+Z here.
	convData[convData.i].a[convData[convData.i].b%convData[convData.i].d.l] = Z;
	convData[convData.i].b++;
	let O = 0;
	for(let i = 0; i < KERNEL.length; i++) {
		O+=convData[convData.i].a[(i+convData[convData.i].b)%convData[convData.i].d.l]*(convData[convData.i].k.a)[i];
	}
	const Q=O/convData[convData.i].d.m; // i think you should just divide yourself if you use negative values, this is terrible
	convData.i++;
	return Q;
},
CONV(BB(t),[1,2,3,4,5,6,7,8,7,6,5,4,3,2,1]);