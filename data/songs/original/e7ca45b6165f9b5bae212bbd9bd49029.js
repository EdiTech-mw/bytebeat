z=t*3/2,m=t*((z>>19)>7?1:0.9)*[1,1,2/3,4/5,1,1,6/5,4/3][z>>17&7],
m1=m*['1121122112121222','1121124112121224','1141128112121282','1241248112121248'][z>>20&3][z>>13&15],
m2=m=>((m&255)<(((z>>12&128?255-(z>>12):(z>>12))&255)+min(64,z>>14))?m:255)&255,
b=(255-((z*'1124114811361248'[z>>14&15])>>6&255))*random(),
s=sin(1e5/(z*'1112112312342345'[z>>15&15]%32768)+4)*64+64,
[
	T=m2(m1),
	T,
	T+b/2,
	T+b/2+s*1.3,
	T=(T+T^m2(m1+(z>>12)))+b/2+s*1.3,
	T,
	m2(m),
	m2(m)+((m1&192)*(z>>10&511)>>8),

	(T=m2(m1)+m2(m))+b,
	T+b,
	T+b+s*2,
	T+(b^s*3),
	(T=T/2+m2(m*2)/2+m2(m1/2)/2)+(b^s*2),
	T+(b^s*3),
	T%(z>>10&511),
	T
][z>>19]/4