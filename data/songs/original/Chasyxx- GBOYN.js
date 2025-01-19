t<1?(this.LFSR=[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]):0,

this.noise??= function(t,o=2,w=0) {

	//if (t<2) {console.error("start")}

	processLFSR = function(width=0) {
		trade =(a,b)=>(LFSR[a] = LFSR[b])
		temp= LFSR[14]^LFSR[13]
		trade(14,13)
		trade(13,12)
		trade(12,11)
		trade(11,10)
		trade(10,9)
		trade(9,8)
		trade(8,7)
		trade(7,6)
		trade(6,5)
		trade(5,4)
		trade(4,3)
		trade(3,2)
		trade(2,1)
		trade(1,0)
		LFSR[0] = temp
		if (width==1) {
		LFSR[6] = temp
		}
	}

	if ((t%(1<<(o)))==0) {
	processLFSR(w)
	//console.log(LFSR)
	v=LFSR[0]
	}
	return v*128

},

noise(t,3,0)