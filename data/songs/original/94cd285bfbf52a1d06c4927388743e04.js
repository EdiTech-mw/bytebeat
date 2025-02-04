// Do not change the "sampleRate" variable.
// It is updated automatically.
let sampleRate = 48000;
const instruments = 7;
const startingTempo = 360;

const MajorScale = {
	C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11
}

class ADSR {
	constructor(attack, decay, sustainTime, sustainLevel, release, exponent=1.0) {
		this._A = attack;
		this._D = decay;
		this._SL = sustainLevel;
		this._ST = sustainTime;
		this._R = release;
		this._E = exponent;
		this._t = 0;
	}
	get v() {
		if(this._t < this._A) return (this._t / this._A) ** this._E;
		else if(this._t < this._A+this._D) {
			const d = ((this._t - this._A) / this._D) ** this._E;
			return (1-d)+(this._SL)*d;
		} else if(this._t < this._A+this._D+this._ST) return this._SL;
		else if(this._t < this._A+this._D+this._ST+this._R) return this._SL*(1-((this._t - this._A - this._D - this._ST) / this._R) ** this._E);
		else return null; // We've already fully released!
	}
	t() {this._t+=(T.T/60)/sampleRate;}
}

class Tempo {
	constructor(tempo = 120) {
		this.T = tempo;
		this._t = this._T = 0;
	}
	s(T) { this.T = T; }
	t() {
		this._t += 1 * (this.T / 60);
		while(this._t > sampleRate) {
			this._t -= sampleRate;
			return 1;
		}
		return 0;
	}
	r() {
		this._t = this._T = 0;
	}
}

let T = new Tempo(startingTempo);

// An abstract class for a voice.
// Create this with a pitch to set Hz and phase values.
class Voice {
	constructor(note, volume=1, adsr = new ADSR(0, 0, 0, 1, 1)) {
		this.phase = 0;
		this.Hz = 2**((MajorScale[note[0]]+{'#':1,'b':-1,' ':0}[note[1]])/12+parseInt(note[2])-4.75)*440;
		this.ADSR = adsr;
		this.v = volume;
	}
	t() {
		this.ADSR.t();
	}
	_p() {
		this.phase = (this.phase + 1 / sampleRate * this.Hz)%1.0;
	}
}

class Square extends Voice {
	constructor(...a) {
		super(...a);
	}
	sample() {
		const v = this.ADSR.v;
		if(v==null) return null;
		this._p();
		return this.phase < 0.5? v * this.v : 0;
	}
}

class String extends Voice {
	constructor(...a) {
		super(...a);
		this.wavetable=Array(256).fill(0).map(k=>random());
this.idx=0;
	}
	sample() {
		const v = this.ADSR.v;
		if(v==null) return null;
		this._p();
		this.wavetable[this.idx+1]=this.wavetable[this.idx+1]*(9/10)+this.wavetable[this.idx]/10,
		this.idx=(this.idx+1)&255;
		return this.wavetable[floor(this.phase*256)] * v * this.v;
	}
}

// Wrapper function for FM instruments.
// X0 - Sine wave.
// X1 - Soft E. piano
// X2 -      E. piano
function FM(brightness) {
	class FMClass extends Voice {
		constructor(...a) {
			super(...a);
		}
		_p() {
		this.phase = (this.phase + (PI*2) / sampleRate * this.Hz)%(PI*40320);
		}
		sample() {
			const v = this.ADSR.v;
			if(v==null) return null;
			const b = brightness>9?v:1;
			this._p();
			switch(brightness%10) {
				case 0: return (sin(this.phase)/2+0.5)*v*this.v;
				case 1: return (sin(sin(this.phase)*0.7*v+this.phase)/2+0.5)*v*this.v
				case 2: return (sin(sin(sin(this.phase*16)/4+this.phase)*1.3*v+this.phase)/2+0.5)*v*this.v
				default: return 0;
			}
		}
	}
	return FMClass;
}

let voices = instruments==null?[]:Array(instruments).fill(null);

function insertVoice(z,...a) {
	for(let i = 0; i < voices.length; i++) {
		if(voices[i]==null) {
			voices[i] = new z(...a);
			return;
		}
	}
	if(instruments==null) voices.push(new z(...a));
}

function tickADSR() {
	for(let i = 0; i < voices.length; i++) {
		if(voices[i] != null) voices[i].t();
	}
}

let time = {idx: 0, beat: 0};

function tick() {
	while( (song[time.idx]?.start ?? Number.POSITIVE_INFINITY) <= time.beat ) {
		const node = song[time.idx];
		time.idx++;
		switch(node.type) {
			case 'instrument': insertVoice(node.class,node.note,node.volume,new ADSR(...node.adsr)); break;
			case 'tempo': T.s(node.tempo); break;
			default: throw `Unknown type ${node.type}, node ${time.idx}: ${JSON.stringify(node)}`; break;
		}
	}
	time.beat++;
}

function mixer(maxVolume) {
	let output = 0;
	for(let i = 0; i < voices.length; i++) {
		if(voices[i]!=null) {
			const sample = voices[i].sample();
			if(sample==null) {
				voices[i] = null;
				continue;
			} else if(typeof sample === 'number' && !isNaN(sample)) {
				output += sample;
			}
		}
	}
	return (output / maxVolume) * 2 - 1;
}

let recompileDetector = null;

function main(t,SR) {
	if(abs(t) < Number.EPSILON) {
		T.r();
		T.s(startingTempo);
		time = {idx: 0, beat: 0};
		voices = instruments==null?[]:Array(instruments).fill(null);
		if (recompileDetector != null) tick();
	} else if(recompileDetector == null) {
		time.beat = floor(t * startingTempo / 60); // This will work fine for songs that don't change tempo.
		// For songs that do, it tries it's best.
		tick();
		recompileDetector = 1;
	}
	sampleRate=SR??sampleRate;
	switch(T.t()) {
		default: break;
		case 1: tick();
		case 0: tickADSR(); break;
	}
	if(instruments==null && (round(t*SR)&255)==0) throw `set instruments to ${voices.length}`;
	return mixer(4);
}

const C = Square; // Try FM(0) FM(2) Square String

const song = [
	{ type: 'tempo', start: 0, tempo: 360 },
	{ type: 'instrument', start: 0 , class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'G#3'},
	{ type: 'instrument', start: 2 , class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'D#3'},
	{ type: 'instrument', start: 3 , class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'F#4'},
	{ type: 'instrument', start: 4 , class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'G#4'},
	{ type: 'instrument', start: 8 , class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'F#4'},
	{ type: 'instrument', start: 14, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'E 4'},
	{ type: 'instrument', start: 20, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'D#4'},

	{ type: 'instrument', start: 25, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'C#3'},
	{ type: 'instrument', start: 26, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'C#4'},
	{ type: 'instrument', start: 33, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'E 4'},
	{ type: 'instrument', start: 40, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 16, 1 ], note: 'C#4'},

	// 12th note
	{ type: 'instrument', start: 52, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'D#3'},
	{ type: 'instrument', start: 53, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'A 3'},
	{ type: 'instrument', start: 55 , class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'G#4'},
	{ type: 'instrument', start: 56 , class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'F#4'},
	{ type: 'instrument', start: 57 , class: C, volume: 1, adsr: [ 0, 0, 0, 1, 10, 1 ], note: 'G#4'},
	{ type: 'instrument', start: 60, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'E 4'},
	{ type: 'instrument', start: 64, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'D#4'},
	{ type: 'instrument', start: 68, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 16, 1 ], note: 'E 4'},

	{ type: 'instrument', start: 75, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'C#3'},
	{ type: 'instrument', start: 76 , class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'F#4'},
	{ type: 'instrument', start: 86, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 16, 1 ], note: 'C#4'},

// 23
	{ type: 'tempo', start: 99, tempo: 440 },
	{ type: 'instrument', start: 99, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'D#3'},
	{ type: 'instrument', start: 100, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'A 3'},
	{ type: 'instrument', start: 102, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'B#3'},
	{ type: 'instrument', start: 103, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'F#4'},
	{ type: 'instrument', start: 104, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'G#4'},
	{ type: 'instrument', start: 108, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'F#4'},
	{ type: 'instrument', start: 112, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'B#3'},
	{ type: 'instrument', start: 116, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'A 3'},
	{ type: 'instrument', start: 120, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'B#3'},
	{ type: 'instrument', start: 120, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'F#4'},

// 34
	{ type: 'instrument', start: 128, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'G#4'},
	{ type: 'instrument', start: 132, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'C#4'},
	{ type: 'instrument', start: 132, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'E 4'},
	{ type: 'instrument', start: 136, class: C, volume: 1.5, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'C#4'},
	{ type: 'instrument', start: 140, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'G#3'},
	{ type: 'instrument', start: 144, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'C#4'},
	{ type: 'instrument', start: 148, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'G#4'},

// 41
	{ type: 'instrument', start: 160, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'G#4'},
	{ type: 'instrument', start: 164, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'A#3'},
	{ type: 'instrument', start: 164, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'C#4'},
	{ type: 'instrument', start: 168, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'G 3'},
	{ type: 'instrument', start: 176, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'E 3'},
	{ type: 'instrument', start: 180, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'G 3'},
	{ type: 'instrument', start: 188, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'C#4'},
	{ type: 'instrument', start: 192, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'G 3'},

// 49
	{ type: 'tempo', start: 196, tempo: 440 },
	{ type: 'instrument', start: 196, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'B 3'},
	{ type: 'instrument', start: 200, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'G#3'},
	{ type: 'instrument', start: 204, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'D#3'},
	{ type: 'instrument', start: 208, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 12, 1 ], note: 'G#3'},

	{ type: 'tempo', start: 212, tempo: 430 },
	{ type: 'instrument', start: 212, class: C, volume: 1, adsr: [ 1, 0, 0, 1, 11, 1 ], note: 'B 3'},
	{ type: 'instrument', start: 216, class: C, volume: 1, adsr: [ 1, 0, 0, 1, 11, 1 ], note: 'G#3'},
	{ type: 'instrument', start: 220, class: C, volume: 1, adsr: [ 1, 0, 0, 1, 11, 1 ], note: 'D#3'},
	{ type: 'instrument', start: 224, class: C, volume: 1, adsr: [ 1, 0, 0, 1, 11, 1 ], note: 'G#3'},

	{ type: 'tempo', start: 228, tempo: 420 },
	{ type: 'instrument', start: 228, class: C, volume: 1, adsr: [ 2, 0, 0, 1, 10, 1 ], note: 'B 3'},
	{ type: 'instrument', start: 232, class: C, volume: 1, adsr: [ 2, 0, 0, 1, 10, 1 ], note: 'G#3'},
	{ type: 'instrument', start: 236, class: C, volume: 1, adsr: [ 2, 0, 0, 1, 10, 1 ], note: 'D#3'},
	{ type: 'instrument', start: 240, class: C, volume: 1, adsr: [ 2, 0, 0, 1, 10, 1 ], note: 'G#3'},

	{ type: 'tempo', start: 244, tempo: 410 },
	{ type: 'instrument', start: 244, class: C, volume: 1, adsr: [ 3, 0, 0, 1, 9, 1 ], note: 'B 3'},
	{ type: 'instrument', start: 248, class: C, volume: 1, adsr: [ 3, 0, 0, 1, 9, 1 ], note: 'G#3'},
	{ type: 'instrument', start: 252, class: C, volume: 1, adsr: [ 3, 0, 0, 1, 9, 1 ], note: 'D#3'},
	{ type: 'instrument', start: 256, class: C, volume: 1, adsr: [ 3, 0, 0, 1, 24, 1 ], note: 'G#3'},
	// { type: 'instrument', start: 164, class: C, volume: 1, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'D 3'},
	// { type: 'instrument', start: 168, class: C, volume: 2, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'A 3'},
	// { type: 'instrument', start: 172, class: C, volume: 2, adsr: [ 0, 0, 0, 1, 9, 1 ], note: 'E 3'},
]

return main;