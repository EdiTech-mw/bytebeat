const Q=16;

return function(sec) {
	const count = sec;
	let x=0;
	for(let i=0;i<min(count,Q);i++)
		x+=sec*(31.25*6+((sec/(Q+4))**7))*(i+1+max(int(sec)-Q+1,0))&1;
	return x/min(count,Q)-1;
}