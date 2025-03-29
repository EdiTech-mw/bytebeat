import { Editor } from './editor.mjs';
import { Library } from './library.mjs';
import { Scope } from './scope.mjs';
import { UI } from './ui.mjs';
import { getCodeFromUrl, getUrlFromCode } from './url.mjs';
import { Actions } from './actions.mjs';
import { splashes } from './splashes.mjs';

import { FavoriteGenerator } from './generator.mjs';
import { Prec } from '@codemirror/state';

const editor = new Editor();
const library = new Library();
const scope = new Scope();
const ui = new UI();
const actions = new Actions();

globalThis.bytebeat = new class {
	constructor() {
		this.audioCtx = null;
		this.micMedia = null;
		this.audioGain = null;
		this.audioRecordChunks = [];
		this.audioRecorder = null;
		this.audioWorkletNode = null;
		this.mediaInputSourceNode = null;
		this.byteSample = 0;
		this.defaultSettings = {
			codeStyle: 'Atom Dark',
			colorDiagram: '#0080ff',
			colorStereo: 1,
			colorTimeCursor: '#80bbff',
			colorWaveform: '#ffffff',
			drawMode: scope.drawMode,
			drawScale: scope.drawScale,
			isSeconds: false,
			showAllSongs: library.showAllSongs,
			themeStyle: 'Default',
			volume: .5,
			audioSampleRate: 48000
		};
		this.isCompilationError = false;
		this.isNeedClear = false;
		this.isPlaying = false;
		this.isRecording = false;
		this.mode = 'Bytebeat';
		this.playbackSpeed = 1;
		this.sampleRate = 8000;
		this.settings = this.defaultSettings;
		this.expectedDomain = 'chasyxx';
		this.startError = null;
		this.init();
	}
	handleEvent(e) {
		let elem = e.target;
		switch(e.type) {
		case 'change':
			switch(elem.id) {
			case 'control-code-style': this.setCodeStyle(elem.value); break;
			case 'control-color-diagram': this.setColorDiagram(elem.value); break;
			case 'control-color-stereo':
				this.setColorStereo(+elem.value);
				ui.controlColorDiagramInfo.innerHTML = scope.getColorTest('colorDiagram');
				ui.controlColorWaveformInfo.innerHTML = scope.getColorTest('colorWaveform');
				break;
			case 'control-color-timecursor': this.setColorTimeCursor(elem.value); break;
			case 'control-color-waveform': this.setColorWaveform(elem.value); break;
			case 'control-drawmode': this.setDrawMode(elem.value); break;
			case 'control-mode': this.setPlaybackMode(elem.value); break;
			case 'control-samplerate':
			case 'control-samplerate-select': this.setSampleRate(+elem.value); break;
			case 'control-theme-style': this.setThemeStyle(elem.value); break;
			case 'library-show-all':
				library.toggleAll(elem, elem.checked);
				this.saveSettings();
				break;
			}
			return;
		case 'click':
			switch(elem.tagName) {
			case 'svg': elem = elem.parentNode; break;
			case 'use': elem = elem.parentNode.parentNode; break;
			default:
				if(elem.classList.contains('control-fast-multiplier')) {
					elem = elem.parentNode;
				}
			}
			switch(elem.id) {
			case 'canvas-container':
			case 'canvas-main':
			case 'canvas-play':
			case 'canvas-timecursor': this.playbackToggle(!this.isPlaying); break;
			case 'control-counter':
			case 'control-pause': this.playbackToggle(false); break;
			case 'control-expand': ui.expandEditor(); break;
			case 'control-link': ui.copyLink(); break;
			case 'control-play-backward': this.playbackToggle(true, true, -1); break;
			case 'control-play-forward': this.playbackToggle(true, true, 1); break;
			case 'control-rec': this.toggleRecording(); break;
			case 'control-reset': this.resetTime(); break;
			case 'control-scale': this.setScale(-scope.drawScale); break;
			case 'control-scaledown': this.setScale(-1, elem); break;
			case 'control-scaleup': this.setScale(1); break;
			case 'control-stop': this.playbackStop(); break;
			case 'control-counter-units': this.toggleCounterUnits(); break;
			case 'actions-format': this.formatCode(); break;
			case 'actions-minibake': this.bake(); break;
			case 'actions-deminibake': this.debake(); break;
			case 'favorites-savefavorite': this.saveFavorite(); break;
			case 'favorites-reload': this.loadFavoriteList(); break;
			case 'settings-audiorate-apply':
				this.setAudioSampleRate(ui.settingsAudioRate.value ?? 48000); break;
			// case 'actions-activate-mic': this.activateMic(); break;
			case 'control-mic': this.toggleMic(); break;
			// case 'actions-deactivate-mic': this.deactivateMic(); break;
			// case 'actions-mic-test': this.micTest(); break;
			case 'splash': this.setSplashtext(); break;
			default:
				if(elem.classList.contains('code-text')) {
					this.loadCode(Object.assign({ code: elem.innerText },
						elem.hasAttribute('data-songdata') ? JSON.parse(elem.dataset.songdata) : {}));
					this.setSplashtext();
				} else if(elem.classList.contains('code-load')) {
					library.onclickCodeLoadButton(elem);
					this.setSplashtext();
				} else if(elem.classList.contains('code-remix-load')) {
					library.onclickRemixLoadButton(elem);
				} else if(elem.classList.contains('library-header')) {
					library.onclickLibraryHeader(elem);
				} else if(elem.parentNode.classList.contains('library-header')) {
					library.onclickLibraryHeader(elem.parentNode);
				}
			}
			return;
		case 'input':
			switch(elem.id) {
			case 'control-counter': this.oninputCounter(e); break;
			case 'control-volume': this.setVolume(false); break;
			}
			return;
		case 'keydown':
			if(elem.id === 'control-counter') {
				this.oninputCounter(e);
			}
			return;
		case 'mouseover':
			if(elem.classList.contains('code-load')) {
				elem.title = `Click to play the ${ elem.dataset.type } code`;
			} else if(elem.classList.contains('code-text')) {
				elem.title = 'Click to play this code';
			} else if(elem.classList.contains('songs-header')) {
				elem.title = 'Click to show/hide the songs';
			}
			return;
		}
	}
	async init() {
		try {
			this.settings = JSON.parse(localStorage.settings);
			scope.drawMode = this.settings.drawMode;
			scope.drawScale = this.settings.drawScale;
			library.showAllSongs = this.settings.showAllSongs;
		} catch(err) {
			this.saveSettings();
		}
		this.setThemeStyle();
		this.setAudioSampleRate();
		try {
			await this.initAudio();
		} catch(e) {
			this.startError = [ 'audioRate', e ];
			this.settings.audioSampleRate = 48000;
			this.saveSettings();
			try {
				await this.initAudio();
			} catch(e) {
				this.startError = [ 'audioInit', e ];
			}
		}
		if(document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => this.initAfterDom());
			return;
		}
		this.initAfterDom();
	}
	handleError(z) {
		const M = z ? $ => {
			window.alert(
				$ +
				'\n\n(This is an emergency error handler as the regular error handler failed. ' +
				'It means either it, or the code editor & UI setup broke. '+
				'I recommend you refresh the page.)'
			);
		} : $ => {
			ui.okAlert($);
		};
		if(this.startError) {
			switch(this.startError[0]) {
			case 'audioRate': M(
				`${ this.startError[1].message }\n\nWe've reset your samplerate to 48000!`); break;
			case 'audioInit': M(
				`We encountered a CRITICAL ERROR starting audio!\n\n${ this.startError[1].stack }`); break;
			default: M(this.startError[1].stack); break;
			}
		}
	}
	initAfterDom() {
		try {
			editor.init();
			ui.initElements();
			this.handleError(0);
		} catch(e) {
			this.handleError(1);
			window.alert('The emergency handler was triggered by:\n\n' + (e.stack ?? e));
		}
		scope.initElements();
		library.initElements();
		this.setVolume(true);
		this.setCounterUnits();
		this.setCodeStyle();
		this.setColorStereo();
		this.setColorDiagram();
		this.setColorWaveform();
		this.setColorTimeCursor();
		this.setScale(0);
		ui.settingsAudioRate.value = this.settings.audioSampleRate;
		this.parseUrl();
		this.sendData({ drawMode: scope.drawMode });
		ui.controlDrawMode.value = scope.drawMode;
		ui.controlThemeStyle.value = this.settings.themeStyle;
		ui.controlCodeStyle.value = this.settings.codeStyle;
		ui.mainElem.addEventListener('click', this);
		ui.mainElem.addEventListener('change', this);
		ui.containerFixed.addEventListener('input', this);
		ui.containerFixed.addEventListener('keydown', this);
		ui.containerScroll.addEventListener('mouseover', this);
		this.loadFavoriteList();
		this.setSplashtext();
		if(!window.location.hostname.includes(this.expectedDomain) &&
		!window.location.hostname.startsWith('127.') &&
		!window.location.hostname.startsWith('::1') &&
		!window.location.hostname.includes('local')) {
			ui.okAlert(
				`[ALERT]\n\nThe expected domain '${ this.expectedDomain }' was not found.\n` +
				`While this site might just be a skid of '${ this.expectedDomain }'` +
				`(try looking up '${ this.expectedDomain } bytebeat player'),\n` +
				'this site has softened up from before and will still let you use it.\n' +
				'Hopefully you find the original. Hope for the best.\n\n' +
				` - Creator of ${ this.expectedDomain } bytebeat player`);
		}
	}
	async initAudio() {
		this.audioCtx = new AudioContext({
			latencyHint: 'balanced',
			sampleRate: this.settings.audioSampleRate
		});
		this.audioGain = new GainNode(this.audioCtx);
		this.audioGain.connect(this.audioCtx.destination);
		await this.audioCtx.audioWorklet.addModule('./build/audio-processor.mjs');
		this.audioWorkletNode = new AudioWorkletNode(this.audioCtx, 'audioProcessor',
			{ outputChannelCount: [2] });
		this.audioWorkletNode.port.addEventListener('message', e => this.receiveData(e.data));
		this.audioWorkletNode.port.start();
		this.audioWorkletNode.connect(this.audioGain);
		const mediaDest = this.audioCtx.createMediaStreamDestination();
		const audioRecorder = this.audioRecorder = new MediaRecorder(mediaDest.stream);
		audioRecorder.addEventListener('dataavailable', e => this.audioRecordChunks.push(e.data));
		audioRecorder.addEventListener('stop', () => {
			let fileName, type;
			const types = ['audio/webm', 'audio/ogg'];
			const files = ['track.webm', 'track.ogg'];
			while((fileName = files.pop()) && !MediaRecorder.isTypeSupported(type = types.pop())) {
				if(types.length === 0) {
					console.error('Recording is not supported in this browser!');
					break;
				}
			}
			const url = URL.createObjectURL(new Blob(this.audioRecordChunks, { type }));
			ui.downloader.href = url;
			ui.downloader.download = fileName;
			ui.downloader.click();
			setTimeout(() => window.URL.revokeObjectURL(url));
		});
		this.audioGain.connect(mediaDest);
	}
	async micTest() {
		const testContext = new AudioContext({
			numberOfChannels: 1,
			length: 1
		});
		try {
			this.micMedia = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
			const tempSource = testContext.createMediaStreamSource(this.micMedia);
			const detectedSampleRate = tempSource.context.sampleRate; // Extract detected sample rate
			if(typeof detectedSampleRate == 'number') {
				ui.yesNoAlert('The samplerate is ' + detectedSampleRate + 'Hz.' +
					'\n\nApply this samplerate now?', ()=>{ this.setAudioSampleRate(detectedSampleRate) }, () => { });
			} else {
				ui.okAlert('I couldn\'t figure out the samplerate.');
			}
		} catch(e) {
			ui.okAlert('I got an error trying to figure out the samplerate.');
			console.error(e);
		} finally {
			testContext.close();
		}
	}
	async toggleMic() {
		if(this.mediaInputSourceNode == null) {
			try {
				this.micMedia ??= await navigator.mediaDevices.getUserMedia({
					audio: {
						echoCancellation: false,
						noiseSuppression: false,
						autoGainControl: false,
						sampleRate: this.settings.audioSampleRate
					},
					video: false
				});
				this.mediaInputSourceNode = this.audioCtx.createMediaStreamSource(this.micMedia);
				this.mediaInputSourceNode.connect(this.audioWorkletNode);
				ui.controlMic.innerHTML = "Mic Down";
				ui.controlMic.title = "Mic is activated. Click to deactivate."
			} catch(e) {
				ui.yesNoAlert('Failed to activate mic. See error?', () => {
					ui.yesNoAlert(e + '\n\nWant the correct samplerate to use?', () => { this.micTest() }, () => { });
				}, () => { });
			}
		} else {
			this.mediaInputSourceNode.disconnect();
			this.mediaInputSourceNode = null;
			this.micMedia = null;
			ui.controlMic.innerHTML = "Mic Up";
			ui.controlMic.title = "Mic is deactivated. Click to activate."
		}
	}
	setSplashtext() {
		if(!window.location.hostname.includes(this.expectedDomain) &&
		!window.location.hostname.startsWith('127.') &&
		!window.location.hostname.startsWith('[::1]') &&
		!window.location.hostname.includes('local'))
			ui.splashElem.innerHTML = 'Featuring the Disturbance in the Force!';
		else ui.splashElem.innerHTML = splashes[Math.random()*splashes.length|0];
	}
	loadCode({ code, sampleRate, mode, drawMode, scale }, isPlay = true) {
		this.mode = ui.controlPlaybackMode.value = mode = mode || 'Bytebeat';
		editor.setValue(code);
		this.setSampleRate(ui.controlSampleRate.value = +sampleRate || 8000, false);
		const data = {
			mode,
			sampleRate: this.sampleRate,
			sampleRatio: this.sampleRate / this.audioCtx.sampleRate
		};
		if(isPlay) {
			data.playbackSpeed = this.playbackSpeed = 1;
			this.playbackToggle(true, false);
			data.resetTime = true;
			data.isPlaying = isPlay;
		}
		data.setFunction = code;
		if(drawMode) {
			ui.controlDrawMode.value = scope.drawMode = drawMode;
			this.saveSettings();
		}
		if(scale !== undefined) {
			this.setScale(scale - scope.drawScale);
		}
		this.sendData(data);
	}
	oninputCounter(e) {
		if(e.key === 'Enter') {
			ui.controlTime.blur();
			this.playbackToggle(true);
			return;
		}
		const { value } = ui.controlTime;
		const byteSample = this.settings.isSeconds ? Math.round(value * this.sampleRate) : value;
		this.setByteSample(byteSample);
		this.sendData({ byteSample });
	}
	parseUrl() {
		let urlHash = window.location.hash;
		if(!urlHash) {
			this.updateUrl();
			urlHash = window.location.hash;
		}
		this.loadCode(getCodeFromUrl(urlHash) || { code: editor.value }, false);
	}
	playbackStop() {
		this.playbackToggle(false, false);
		this.sendData({ isPlaying: false, resetTime: true });
	}
	playbackToggle(isPlaying, isSendData = true, speedIncrement = 0) {
		const isReverse = speedIncrement ? speedIncrement < 0 : this.playbackSpeed < 0;
		const buttonElem = isReverse ? ui.controlPlayBackward : ui.controlPlayForward;
		if(speedIncrement && buttonElem.getAttribute('disabled')) {
			return;
		}
		const multiplierElem = buttonElem.firstElementChild;
		const speed = speedIncrement ? +multiplierElem.textContent : 1;
		multiplierElem.classList.toggle('control-fast-multiplier-large', speed >= 8);
		const nextSpeed = speed === 64 ? 0 : speed * 2;
		ui.setPlayButton(ui.controlPlayBackward, isPlaying && isReverse ? nextSpeed : 1);
		ui.setPlayButton(ui.controlPlayForward, isPlaying && !isReverse ? nextSpeed : 1);
		if(speedIncrement || !isPlaying) {
			this.playbackSpeed = isPlaying ? speedIncrement * speed : Math.sign(this.playbackSpeed);
		}
		scope.canvasContainer.title = isPlaying ? `Click to ${
			this.isRecording ? 'pause and stop recording' : 'pause' }` :
			`Click to play${ isReverse ? ' in reverse' : '' }`;
		scope.canvasPlayButton.classList.toggle('canvas-play-backward', isReverse);
		scope.canvasPlayButton.classList.toggle('canvas-play', !isPlaying);
		scope.canvasPlayButton.classList.toggle('canvas-pause', isPlaying);
		if(isPlaying) {
			scope.canvasPlayButton.classList.remove('canvas-initial');
			if(this.audioCtx.resume) {
				this.audioCtx.resume();
				scope.requestAnimationFrame(); // Main call for drawing in the scope
			}
		} else {
			if(this.isRecording) {
				this.isRecording = false;
				ui.controlRecord.classList.remove('control-recording');
				ui.controlRecord.title = 'Record to file';
				this.audioRecorder.stop();
			}
		}
		this.isPlaying = isPlaying;
		if(isSendData) {
			this.sendData({ isPlaying, playbackSpeed: this.playbackSpeed });
		} else {
			this.isNeedClear = true;
		}
	}
	receiveData(data) {
		const { byteSample, drawBuffer, error } = data;
		if(typeof byteSample === 'number') {
			this.setCounterValue(byteSample);
			this.setByteSample(byteSample);
		}
		if(Array.isArray(drawBuffer)) {
			scope.drawBuffer = scope.drawBuffer.concat(drawBuffer);
			const limit = scope.canvasWidth * (1 << scope.drawScale) - 1;
			if(scope.drawBuffer.length > limit) {
				scope.drawBuffer = scope.drawBuffer.slice(-limit);
			}
		}
		if(error !== undefined) {
			let isUpdate = false;
			if(error.isCompiled === false) {
				isUpdate = true;
				this.isCompilationError = true;
			} else if(error.isCompiled === true) {
				isUpdate = true;
				this.isCompilationError = false;
			} else if(error.isRuntime === true && !this.isCompilationError) {
				isUpdate = true;
			}
			if(isUpdate) {
				editor.errorElem.innerText = error.message;
				this.sendData({ errorDisplayed: true });
			}
			if(data.updateUrl !== true) {
				ui.setCodeSize(editor.value);
			}
		}
		if(data.updateUrl === true) {
			this.updateUrl();
		}
	}
	resetTime() {
		this.isNeedClear = true;
		this.sendData({ resetTime: true, playbackSpeed: this.playbackSpeed });
	}
	saveSettings() {
		this.settings.drawMode = scope.drawMode;
		this.settings.drawScale = scope.drawScale;
		this.settings.showAllSongs = library.showAllSongs;
		localStorage.settings = JSON.stringify(this.settings);
	}
	sendData(data) {
		this.audioWorkletNode.port.postMessage(data);
	}
	setByteSample(value) {
		this.byteSample = +value || 0;
		if(this.isNeedClear && value === 0) {
			this.isNeedClear = false;
			scope.drawBuffer = [];
			scope.clearCanvas();
			scope.canvasTimeCursor.style.left = 0;
			if(!this.isPlaying) {
				scope.canvasPlayButton.classList.add('canvas-initial');
			}
		}
	}
	setCodeStyle(value) {
		if(value === undefined) {
			if((value = this.settings.codeStyle) === undefined) {
				value = this.settings.codeStyle = this.defaultSettings.codeStyle;
				this.saveSettings();
			}
			editor.container.dataset.theme = value;
			return;
		}
		editor.container.dataset.theme = this.settings.codeStyle = value;
		this.saveSettings();
	}
	setColorStereo(value) {
		// value: Red=0, Green=1, Blue=2
		if(value !== undefined) {
			this.settings.colorStereo = value;
			this.saveSettings();
		} else if((value = this.settings.colorStereo) === undefined) {
			value = this.settings.colorStereo = this.defaultSettings.colorStereo;
			this.saveSettings();
		}
		ui.controlColorStereo.value = value;
		switch(value) {
		// [Left, Right1, Right2]
		case 0: scope.colorChannels = [0, 1, 2]; break;
		case 2: scope.colorChannels = [2, 0, 1]; break;
		default: scope.colorChannels = [1, 0, 2];
		}
	}
	setColorDiagram(value) {
		if(value !== undefined) {
			this.settings.colorDiagram = value;
			this.saveSettings();
		} else if((value = this.settings.colorDiagram) === undefined) {
			value = this.settings.colorDiagram = this.defaultSettings.colorDiagram;
			this.saveSettings();
		}
		ui.controlColorDiagram.value = value;
		ui.controlColorDiagramInfo.innerHTML = scope.getColorTest('colorDiagram', value);
	}
	setColorTimeCursor(value) {
		if(value !== undefined) {
			this.settings.colorTimeCursor = value;
			this.saveSettings();
		} else if((value = this.settings.colorTimeCursor) === undefined) {
			value = this.settings.colorTimeCursor = this.defaultSettings.colorTimeCursor;
			this.saveSettings();
		}
		ui.controlColorTimeCursor.value = value;
		scope.canvasTimeCursor.style.borderLeft = '2px solid ' + value;
	}
	setColorWaveform(value) {
		if(value !== undefined) {
			this.settings.colorWaveform = value;
			this.saveSettings();
		} else if((value = this.settings.colorWaveform) === undefined) {
			value = this.settings.colorWaveform = this.defaultSettings.colorWaveform;
			this.saveSettings();
		}
		ui.controlColorWaveform.value = value;
		ui.controlColorWaveformInfo.innerHTML = scope.getColorTest('colorWaveform', value);
	}
	setAudioSampleRate(value) {
		if(value !== undefined) {
			this.settings.audioSampleRate = value;
			this.saveSettings();
			window.location.reload();
		} else if((value = this.settings.audioSampleRate) === undefined) {
			value = this.settings.audioSampleRate = this.defaultSettings.audioSampleRate;
			this.saveSettings();
		}
	}
	setCounterUnits() {
		ui.controlTimeUnits.textContent = this.settings.isSeconds ? 'sec' : 't';
		this.setCounterValue(this.byteSample);
	}
	setCounterValue(value) {
		ui.controlTime.value = this.settings.isSeconds ? (value / this.sampleRate).toFixed(2) : value;
	}
	setDrawMode(drawMode) {
		scope.drawMode = drawMode;
		this.saveSettings();
		this.sendData({ drawMode });
	}
	setPlaybackMode(mode) {
		this.mode = mode;
		this.updateUrl();
		this.sendData({ mode });
	}
	setSampleRate(sampleRate, isSendData = true) {
		if(!sampleRate || !isFinite(sampleRate) ||
			// Float32 limit
			(sampleRate = Number(parseFloat(Math.abs(sampleRate)).toFixed(4))) > 3.4028234663852886E+38
		) {
			sampleRate = 8000;
		}
		switch(sampleRate) {
		case 8000:
		case 11025:
		case 16000:
		case 22050:
		case 32000:
		case 44100:
		case 48000: ui.controlSampleRateSelect.value = sampleRate; break;
		default: ui.controlSampleRateSelect.selectedIndex = -1;
		}
		ui.controlSampleRate.value = this.sampleRate = sampleRate;
		ui.controlSampleRate.blur();
		ui.controlSampleRateSelect.blur();
		scope.toggleTimeCursor();
		if(isSendData) {
			this.updateUrl();
			this.sendData({
				sampleRate: this.sampleRate,
				sampleRatio: this.sampleRate / this.audioCtx.sampleRate
			});
		}
	}
	setScale(amount, buttonElem) {
		if(buttonElem?.getAttribute('disabled')) {
			return;
		}
		const scale = Math.max(scope.drawScale + amount, 0);
		scope.drawScale = scale;
		ui.controlScale.innerHTML = !scale ? '1x' :
			scale < 7 ? `1/${ 2 ** scale }${ scale < 4 ? 'x' : '' }` :
			`<sub>2</sub>-${ scale }`;
		this.saveSettings();
		scope.clearCanvas();
		scope.toggleTimeCursor();
		if(scope.drawScale <= 0) {
			ui.controlScaleDown.setAttribute('disabled', true);
		} else {
			ui.controlScaleDown.removeAttribute('disabled');
		}
	}
	setThemeStyle(value) {
		if(value === undefined) {
			if((value = this.settings.themeStyle) === undefined) {
				value = this.settings.themeStyle = this.defaultSettings.themeStyle;
				this.saveSettings();
			}
			document.documentElement.dataset.theme = value;
			return;
		}
		document.documentElement.dataset.theme = this.settings.themeStyle = value;
		let colorCursor, colorDiagram;
		let colorStereo = 1; // Red=0, Green=1, Blue=2
		switch(value) {
		case 'Cake':
			colorCursor = '#40ffff';
			colorDiagram = '#ff00ff';
			colorStereo = 0;
			break;
		case 'Orange':
			colorCursor = '#ffff80';
			colorDiagram = '#8000ff';
			colorStereo = 0;
			break;
		case 'Purple':
			colorCursor = '#ff50ff';
			colorDiagram = '#a040ff';
			colorStereo = 0;
			break;
		case 'Teal':
			colorCursor = '#80c0ff';
			colorDiagram = '#00ffff';
			break;
		default:
			colorCursor = '#00ff00';
			colorDiagram = '#00c080';
		}
		this.setColorTimeCursor(colorCursor);
		this.setColorStereo(colorStereo);
		ui.controlColorWaveformInfo.innerHTML = scope.getColorTest('colorWaveform');
		this.setColorDiagram(ui.controlColorDiagram.value = colorDiagram); // Contains this.saveSettings();
	}
	setVolume(isInit) {
		let volumeValue = NaN;
		if(isInit) {
			volumeValue = parseFloat(this.settings.volume);
		}
		if(isNaN(volumeValue)) {
			volumeValue = ui.controlVolume.value / ui.controlVolume.max;
		}
		ui.controlVolume.value = this.settings.volume = volumeValue;
		ui.controlVolume.title = `Volume: ${ (volumeValue * 100).toFixed(0) }%`;
		ui.controlVolumeDisplay.textContent = `${ (volumeValue * 100).toFixed(0) }%`;
		this.saveSettings();
		this.audioGain.gain.value = volumeValue * volumeValue;
	}
	toggleCounterUnits() {
		this.settings.isSeconds = !this.settings.isSeconds;
		this.saveSettings();
		this.setCounterUnits();
	}
	toggleRecording() {
		if(!this.audioCtx) {
			return;
		}
		if(this.isRecording) {
			this.playbackToggle(false);
			return;
		}
		this.isRecording = true;
		ui.controlRecord.classList.add('control-recording');
		ui.controlRecord.title = 'Pause and stop recording';
		this.audioRecorder.start();
		this.audioRecordChunks = [];
		this.playbackToggle(true);
	}
	formatCode() {
		const code1 = editor.value;
		const data = actions.commaFormat(code1, ui.controlMaxParens.value);
		if(data.error) {
			ui.okAlert(`Format failed: ${ data.error }!`);
			return;
		}
		editor.setValue(data.code);
	}
	bake() {
		const toEncode = editor.value;

		if(actions.unminibakeCode(toEncode)!==toEncode) {
			ui.okAlert('Code is already minibaked.');
			return;
		}

		const l = actions.minibakeCode(toEncode);
		if(actions.unminibakeCode(l) !== l) {
			editor.setValue(l);
		} else {
			ui.okAlert('Minibaking reverted: the player will lag!');
		}
		return;
	}
	debake() {
		editor.setValue(actions.unminibakeCode(editor.value));
	}
	updateUrl() {
		const code = editor.value;
		ui.setCodeSize(code);
		getUrlFromCode(code, this.mode, this.sampleRate);
	}
	favoriteErrorBox(error) {
		ui.yesNoAlert(`${ error.message }\n\n${ error.stack }\n\n` +
			'This may indicate your favorites are corrupted.\nDo you want to erase them?', () => {
			localStorage.favorites = '{}';
			this.loadFavoriteList();
		}, () => { });
	}
	saveFavorite() {
		this.updateUrl();
		try {
			const favorites = JSON.parse(localStorage.favorites??'[]');
			favorites.push({
				name: ui.favoritesNameInput.value,
				info: {
					mode: this.mode,
					samplerate: this.sampleRate,
					size: new Blob([editor.value]).size
				},
				url: window.location.hash
			});
			localStorage.favorites = JSON.stringify(favorites);
		} catch(e) {
			this.favoriteErrorBox(e);
		} finally {
			this.loadFavoriteList();
		}
	}
	loadFavoriteList() {
		try {
			const favorites = JSON.parse(localStorage.favorites??'[]');
			if(!Array.isArray(favorites)) {
				const newFavorites = [];
				for(const i in favorites) {
					const newFavorite = {};
					newFavorite.name = decodeURIComponent(i).split(': ').slice(1).join(': ');
					newFavorite.info = decodeURIComponent(i).split(': ')[0];
					newFavorite.url = decodeURIComponent(favorites[i]);
					newFavorites.push(newFavorite);
				}
				localStorage.favorites = JSON.stringify(newFavorites);
				ui.okAlert('Your favorites have been converted!', () => this.loadFavoriteList());
				return;
			}
			while(ui.favoritesList.children.length > 0)
				ui.favoritesList.removeChild(ui.favoritesList.children[0]); // sacrifice to Armok
			for(let i in favorites) {
				i=+i; // It saves your sanity.
				const favorite = favorites[i];
				const li = FavoriteGenerator.buildFavoriteEntry(i, favorite, favorites.length, () => {
					ui.yesNoAlert(
						'Are you sure you want to delete this favorite?',
						() => {
							try {
								const favorites = JSON.parse(localStorage.favorites ?? '[]');
								favorites.splice(i, 1);
								localStorage.favorites = JSON.stringify(favorites);
							} catch(e) {
								this.favoriteErrorBox(e);
							} finally {
								this.loadFavoriteList();
							}
						},
						() => {}
					);
				}, () => {
					ui.yesNoAlert(
						'Are you sure you want to overwrite this favorite?',
						() => {
							try {
								const favorites = JSON.parse(localStorage.favorites ?? '[]');
								this.updateUrl();
								favorites[i] = {
									name: favorites[i].name,
									info: {
										mode: this.mode,
										samplerate: this.sampleRate,
										size: new Blob([editor.value]).size
									},
									url: window.location.hash
								};
								localStorage.favorites = JSON.stringify(favorites);
							} catch(e) {
								this.favoriteErrorBox(e);
							} finally {
								this.loadFavoriteList();
							}
						},
						() => {}
					);
				}, () => {
					ui.yesNoAlert(
						'Are you sure you want to rename this favorite to what\'s in the "New favorite" bar?',
						() => {
							try {
								const favorites = JSON.parse(localStorage.favorites ?? '[]');
								this.updateUrl();
								favorites[i].name = ui.favoritesNameInput.value;
								localStorage.favorites = JSON.stringify(favorites);
							} catch(e) {
								this.favoriteErrorBox(e);
							} finally {
								this.loadFavoriteList();
							}
						},
						() => {}
					);
				});
				ui.favoritesList.appendChild(li);
				ui.favoritesList.appendChild(document.createElement('hr'));
			}
			// Remove the last <hr> element
			if(ui.favoritesList.children.length > 0)
				ui.favoritesList.removeChild(ui.favoritesList.children[ui.favoritesList.children.length-1]);
		} catch(e) {
			this.favoriteErrorBox(e);
		}
	}
}();
