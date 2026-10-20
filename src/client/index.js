// 由 tools/build.mjs 从 client/ 生成 —— 勿手改；改源后运行 node tools/build.mjs（client 静态 bundle）
// 静态 bundle 格式：classic script 注册到 __ModuleLoader__，factory 为 CJS 形式。
// 形态契约见 tools/verify-bundle.mjs：注册 id 必须是包名、require 只许 react 系 seed、
// <style> 必须带 data-plugin=包名（loader 按它认领/回收样式）。
window.__ModuleLoader__.load({
  id: 'dsh-xueqiu-debug',
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    const React = require('react')

    // 动态运行时 styles.insert 的替代：自管 <style> 标签（随插件停用移除交给卸载流程）
    let _styleTag = null
    function insertStyle (css) {
      if (typeof document === 'undefined' || !document.head) return
      _styleTag = document.createElement('style')
      _styleTag.setAttribute('data-plugin', 'dsh-xueqiu-debug')
      _styleTag.textContent = css
      document.head.appendChild(_styleTag)
    }

    // vendored KLineChart v10 UMD（assets/klinecharts.min.js，Apache-2.0）
    ;(function () {
      var module = undefined, exports = undefined, define = undefined
/**
     * @license
     * KLineChart v10.0.2
     * Copyright (c) 2019 lihu.
     * Licensed under Apache License 2.0 https://www.apache.org/licenses/LICENSE-2.0
     */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self).klinecharts={})}(this,(function(t){"use strict";var e=function(t,i){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)Object.prototype.hasOwnProperty.call(e,i)&&(t[i]=e[i])},e(t,i)};function i(t,i){if("function"!=typeof i&&null!==i)throw new TypeError("Class extends value "+String(i)+" is not a constructor or null");function r(){this.constructor=t}e(t,i),t.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}var r=function(){return r=Object.assign||function(t){for(var e,i=1,r=arguments.length;i<r;i++)for(var n in e=arguments[i])Object.prototype.hasOwnProperty.call(e,n)&&(t[n]=e[n]);return t},r.apply(this,arguments)};function n(t,e){var i={};for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&e.indexOf(r)<0&&(i[r]=t[r]);if(null!=t&&"function"==typeof Object.getOwnPropertySymbols){var n=0;for(r=Object.getOwnPropertySymbols(t);n<r.length;n++)e.indexOf(r[n])<0&&Object.prototype.propertyIsEnumerable.call(t,r[n])&&(i[r[n]]=t[r[n]])}return i}function o(t,e,i,r){return new(i||(i=Promise))((function(n,o){function a(t){try{l(r.next(t))}catch(t){o(t)}}function s(t){try{l(r.throw(t))}catch(t){o(t)}}function l(t){var e;t.done?n(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e)}))).then(a,s)}l((r=r.apply(t,e||[])).next())}))}function a(t,e){var i,r,n,o={label:0,sent:function(){if(1&n[0])throw n[1];return n[1]},trys:[],ops:[]},a=Object.create(("function"==typeof Iterator?Iterator:Object).prototype);return a.next=s(0),a.throw=s(1),a.return=s(2),"function"==typeof Symbol&&(a[Symbol.iterator]=function(){return this}),a;function s(s){return function(l){return function(s){if(i)throw new TypeError("Generator is already executing.");for(;a&&(a=0,s[0]&&(o=0)),o;)try{if(i=1,r&&(n=2&s[0]?r.return:s[0]?r.throw||((n=r.return)&&n.call(r),0):r.next)&&!(n=n.call(r,s[1])).done)return n;switch(r=0,n&&(s=[2&s[0],n.value]),s[0]){case 0:case 1:n=s;break;case 4:return o.label++,{value:s[1],done:!1};case 5:o.label++,r=s[1],s=[0];continue;case 7:s=o.ops.pop(),o.trys.pop();continue;default:if(!(n=o.trys,(n=n.length>0&&n[n.length-1])||6!==s[0]&&2!==s[0])){o=0;continue}if(3===s[0]&&(!n||s[1]>n[0]&&s[1]<n[3])){o.label=s[1];break}if(6===s[0]&&o.label<n[1]){o.label=n[1],n=s;break}if(n&&o.label<n[2]){o.label=n[2],o.ops.push(s);break}n[2]&&o.ops.pop(),o.trys.pop();continue}s=e.call(t,o)}catch(t){s=[6,t],r=0}finally{i=n=0}if(5&s[0])throw s[1];return{value:s[0]?s[1]:void 0,done:!0}}([s,l])}}}function s(t){var e="function"==typeof Symbol&&Symbol.iterator,i=e&&t[e],r=0;if(i)return i.call(t);if(t&&"number"==typeof t.length)return{next:function(){return t&&r>=t.length&&(t=void 0),{value:t&&t[r++],done:!t}}};throw new TypeError(e?"Object is not iterable.":"Symbol.iterator is not defined.")}function l(t,e){var i="function"==typeof Symbol&&t[Symbol.iterator];if(!i)return t;var r,n,o=i.call(t),a=[];try{for(;(void 0===e||e-- >0)&&!(r=o.next()).done;)a.push(r.value)}catch(t){n={error:t}}finally{try{r&&!r.done&&(i=o.return)&&i.call(o)}finally{if(n)throw n.error}}return a}function u(t,e,i){if(i||2===arguments.length)for(var r,n=0,o=e.length;n<o;n++)!r&&n in e||(r||(r=Array.prototype.slice.call(e,0,n)),r[n]=e[n]);return t.concat(r||Array.prototype.slice.call(e))}function c(t,e){if(g(t)||g(e))for(var i in e)if(Object.prototype.hasOwnProperty.call(e,i)){var r=t[i],n=e[i];g(n)&&g(r)?c(r,n):t[i]=h(n)}}function h(t){if(!g(t))return t;var e=null;for(var i in e=d(t)?[]:{},t)if(Object.prototype.hasOwnProperty.call(t,i)){var r=t[i];g(r)?e[i]=h(r):e[i]=r}return e}function d(t){return"[object Array]"===Object.prototype.toString.call(t)}function p(t){return"function"==typeof t}function g(t){return"object"==typeof t&&f(t)}function v(t){return"number"==typeof t&&Number.isFinite(t)}function f(t){return null!=t}function y(t){return"boolean"==typeof t}function m(t){return"string"==typeof t}"function"==typeof SuppressedError&&SuppressedError;var _=-1;function x(t){return p(window.requestAnimationFrame)?window.requestAnimationFrame(t):window.setTimeout(t,20)}function b(t){p(window.cancelAnimationFrame)?window.cancelAnimationFrame(t):window.clearTimeout(t)}var w=function(){function t(t){this._options={duration:500,iterationCount:1},this._currentIterationCount=0,this._running=!1,this._requestAnimationId=_,this._time=0,c(this._options,t)}return t.prototype._loop=function(){var t=this;this._running=!0,this._time=performance.now();var e=function(i){var r;if(t._requestAnimationId=_,t._running){var n="number"==typeof i?i:performance.now(),o=Math.max(0,n-t._time);o<t._options.duration?(null===(r=t._doFrameCallback)||void 0===r||r.call(t,o),t._running&&t._requestAnimationId===_&&(t._requestAnimationId=x(e))):(t.stop(),t._currentIterationCount++,t._currentIterationCount<t._options.iterationCount&&t._loop())}};this._requestAnimationId=x(e)},t.prototype.doFrame=function(t){return this._doFrameCallback=t,this},t.prototype.setDuration=function(t){return this._options.duration=t,this},t.prototype.setIterationCount=function(t){return this._options.iterationCount=t,this},t.prototype.start=function(){this._running||(this._currentIterationCount=0,this._loop())},t.prototype.stop=function(){var t;this._running&&(this.cancel(),null===(t=this._doFrameCallback)||void 0===t||t.call(this,this._options.duration)),this._running=!1},t.prototype.cancel=function(){this._requestAnimationId!==_&&(b(this._requestAnimationId),this._requestAnimationId=_),this._running=!1},t}();function C(t){var e={width:0,height:0,left:0,right:0,top:0,bottom:0};return f(t)&&c(e,t),e}var E=null;function I(t){var e,i;return null!==(i=null===(e=t.ownerDocument.defaultView)||void 0===e?void 0:e.devicePixelRatio)&&void 0!==i?i:1}function T(t,e,i){return"".concat(null!=e?e:"normal"," ").concat(null!=t?t:12,"px ").concat(null!=i?i:"Helvetica Neue")}function S(t,e,i,r){if(!f(E)){var n=document.createElement("canvas"),o=I(n);(E=n.getContext("2d")).scale(o,o)}return E.font=T(e,i,r),Math.round(E.measureText(t).width)}function A(t,e){var i,r=document.createElement(t),n=null!=e?e:{};for(var o in n)r.style[o]=null!==(i=n[o])&&void 0!==i?i:"";return r}var M=1,P=Date.now();function D(t){var e=Date.now();return e===P?++M:M=1,P=e,"".concat(null!=t?t:"").concat(e,"_").concat(M)}function k(t,e,i){var r=0,n=0;for(n=t.length-1;r!==n;){var o=Math.floor((n+r)/2),a=n-r,s=t[o][e];if(i===t[r][e])return r;if(i===t[n][e])return n;if(i===s)return o;if(i>s?r=o:n=o,a<=2)break}return r}function B(t,e){e=Math.max(0,null!=e?e:0);var i=Math.pow(10,e);return Math.round(t*i)/i}function F(t,e,i){for(var r,n,o=[Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],a=t.length,s=0;s<a;){var l=t[s];o[0]=Math.max(null!==(r=l[e])&&void 0!==r?r:Number.MIN_SAFE_INTEGER,o[0]),o[1]=Math.min(null!==(n=l[i])&&void 0!==n?n:Number.MAX_SAFE_INTEGER,o[1]),++s}return o}function R(t){return 0===t?0:Math.log10(t)}function L(t){return Math.pow(10,t)}var O=2,Y=0,W=/\\(\\)?/g,z=new RegExp("[^.[\\]]+|\\[(?:([^\"'][^[]*)|([\"'])((?:(?!\\2)[^\\\\]|\\\\.)*?)\\2)\\]|(?=(?:\\.|\\[\\])(?:\\.|\\[\\]|$))","g");function V(t,e,i){if(e.length>0&&!e.includes(".")&&!e.includes("[")&&!e.includes("]"))return f(t)&&f(n=t[e])?n:null!=i?i:"--";if(f(t)){var r=[];e.replace(z,(function(t){for(var e=[],i=1;i<arguments.length;i++)e[i-1]=arguments[i];var n=t;return f(e[1])?n=e[2].replace(W,"$1"):f(e[0])&&(n=e[0].trim()),r.push(n),""}));for(var n=t,o=0,a=r.length;f(n)&&o<a;)n=null==n?void 0:n[r[o++]];return f(n)?n:null!=i?i:"--"}return null!=i?i:"--"}function N(t,e,i){var r=function(t,e){var i={};return t.formatToParts(new Date(e)).forEach((function(t){var e=t.type,r=t.value;switch(e){case"year":i.YYYY=r;break;case"month":i.MM=r;break;case"day":i.DD=r;break;case"hour":i.HH="24"===r?"00":r;break;case"minute":i.mm=r;break;case"second":i.ss=r}})),i}(t,e);return i.replace(/YYYY|MM|DD|HH|mm|ss/g,(function(t){return r[t]}))}function H(t,e){var i=+t;return v(i)?i.toFixed(null!=e?e:2):"".concat(t)}function X(t){var e=+t;if(v(e)){var i=e<0?"-":"",r=Math.abs(e);if(r>=1e9)return"".concat(i).concat(+(r/1e9).toFixed(3),"B");if(r>=1e6)return"".concat(i).concat(+(r/1e6).toFixed(3),"M");if(r>=1e3)return"".concat(i).concat(+(r/1e3).toFixed(3),"K")}return"".concat(t)}function U(t,e){var i="".concat(t);if(0===e.length)return i;if(i.includes(".")){var r=i.split(".");return"".concat(r[0].replace(/(\d)(?=(\d{3})+$)/g,(function(t){return"".concat(t).concat(e)})),".").concat(r[1])}return i.replace(/(\d)(?=(\d{3})+$)/g,(function(t){return"".concat(t).concat(e)}))}function G(t,e){var i="".concat(t);if(new RegExp("\\.0{"+e+",}[1-9][0-9]*$").test(i)){var r=i.split("."),n=r.length-1,o=r[n],a=/0*/.exec(o);if(f(a)){var s=a[0].length;return r[n]=o.replace(/0*/,"0{".concat(s,"}")),r.join(".")}}return i}function Z(t,e){return t.replace(/\{(\w+)\}/g,(function(t,i){var r=e[i];return f(r)?r:"{".concat(i,"}")}))}var j="candle_pane",q="indicator_pane_",K="x_axis_pane";var Q=function(){function t(t){this.scrollZoomEnabled=!0,this._range={from:0,to:0,range:0,realFrom:0,realTo:0,realRange:0,displayFrom:0,displayTo:0,displayRange:0},this._prevRange={from:0,to:0,range:0,realFrom:0,realTo:0,realRange:0,displayFrom:0,displayTo:0,displayRange:0},this._ticks=[],this._autoCalcTickFlag=!0,this._parent=t}return t.prototype.getParent=function(){return this._parent},t.prototype.buildTicks=function(t){return this._autoCalcTickFlag&&(this._range=this.createRangeImp()),!(this._prevRange.from===this._range.from&&this._prevRange.to===this._range.to&&!t)&&(this._prevRange=this._range,this._ticks=this.createTicksImp(),!0)},t.prototype.getTicks=function(){return this._ticks},t.prototype.setRange=function(t){this._autoCalcTickFlag=!1,this._range=t},t.prototype.getRange=function(){return this._range},t.prototype.setAutoCalcTickFlag=function(t){this._autoCalcTickFlag=t},t.prototype.getAutoCalcTickFlag=function(){return this._autoCalcTickFlag},t}(),$="yAxis_",J=function(t){function e(e,i){var r=t.call(this,e)||this;r.id="",r.paneId="",r.reverse=!1,r.inside=!1,r.position="right",r.gap={top:.2,bottom:.1},r.createRange=function(t){return t.defaultRange},r.minSpan=function(t){return L(-t)},r.valueToRealValue=function(t){return t},r.realValueToDisplayValue=function(t){return t},r.displayValueToRealValue=function(t){return t},r.realValueToValue=function(t){return t},r.displayValueToText=function(t,e){return H(t,e)};var o=i.minSpan,a=i.valueToRealValue,s=i.realValueToDisplayValue,l=i.displayValueToRealValue,u=i.realValueToValue,c=i.displayValueToText,h=n(i,["minSpan","valueToRealValue","realValueToDisplayValue","displayValueToRealValue","realValueToValue","displayValueToText"]);return p(o)&&(r.minSpan=o),p(a)&&(r.valueToRealValue=a),p(s)&&(r.realValueToDisplayValue=s),p(l)&&(r.displayValueToRealValue=l),p(u)&&(r.realValueToValue=u),p(c)&&(r.displayValueToText=c),r.override(h),r}return i(e,t),e.prototype.override=function(t){var e=t.id,i=t.name,r=t.gap,o=n(t,["id","name","gap"]);f(e)&&0===this.id.length&&(this.id=e),!m(this.name)&&m(i)&&(this.name=i),c(this.gap,r),c(this,o)},e.prototype._getIndicatorsByYAxisIds=function(){var t=this.getParent(),e=new Set([this.id]);if(t.isManualYAxis(this.id)){var i=t.getDefaultYAxisId();f(i)&&e.add(i)}return t.getChart().getChartStore().getIndicatorsByPaneId(t.getId()).filter((function(t){return e.has(t.yAxisId)}))},e.prototype._shouldUseCandleData=function(){var t=this.getParent();return this.isInCandle()&&(t.isDefaultYAxis(this.id)||t.isManualYAxis(this.id))},e.prototype.createRangeImp=function(){var t,e,i=this.getParent(),r=i.getChart(),n=r.getChartStore(),o=i.getId(),a=Number.MAX_SAFE_INTEGER,s=Number.MIN_SAFE_INTEGER,l=!1,u=Number.MAX_SAFE_INTEGER,c=Number.MIN_SAFE_INTEGER,h=Number.MAX_SAFE_INTEGER,d=this._getIndicatorsByYAxisIds();d.forEach((function(t){l||(l=t.shouldOhlc),h=Math.min(h,t.precision),v(t.minValue)&&(u=Math.min(u,t.minValue)),v(t.maxValue)&&(c=Math.max(c,t.maxValue))}));var p=4,g=this.isInCandle();if(g){var y=null!==(e=null===(t=n.getSymbol())||void 0===t?void 0:t.pricePrecision)&&void 0!==e?e:O;p=h!==Number.MAX_SAFE_INTEGER?Math.min(h,y):y}else h!==Number.MAX_SAFE_INTEGER&&(p=h);var m=n.getVisibleRangeDataList(),_=r.getStyles().candle,x="area"===_.type,b=_.area.value,w=this._shouldUseCandleData(),C=w&&!x||!g&&l;m.forEach((function(t){var e=t.dataIndex,i=t.data.current;if(f(i)&&(C&&(a=Math.min(a,i.low),s=Math.max(s,i.high)),w&&x)){var r=i[b];v(r)&&(a=Math.min(a,r),s=Math.max(s,r))}d.forEach((function(t){var i,r=t.result,n=t.figures,o=null!==(i=r[e])&&void 0!==i?i:{};n.forEach((function(t){var e=o[t.key];v(e)&&(a=Math.min(a,e),s=Math.max(s,e))}))}))})),a!==Number.MAX_SAFE_INTEGER&&s!==Number.MIN_SAFE_INTEGER?(a=Math.min(u,a),s=Math.max(c,s)):(a=0,s=10);var E=s-a,I={from:a,to:s,range:E,realFrom:a,realTo:s,realRange:E,displayFrom:a,displayTo:s,displayRange:E},T=this.createRange({chart:r,paneId:o,defaultRange:I}),S=T.realFrom,A=T.realTo,M=T.realRange,P=this.minSpan(p);if(S===A||M<P){var D=u===S,k=c===A;S=D?S:k?S-8*P:S-4*P,A=k?A:D?A+8*P:A+4*P}var B=this.getBounding().height,F=this.gap,R=F.top;R>=1&&(R/=B);var L=F.bottom;L>=1&&(L/=B),S-=(M=A-S)*L,A+=M*R;var Y=this.realValueToValue(S,{range:T}),W=this.realValueToValue(A,{range:T}),z=this.realValueToDisplayValue(S,{range:T}),V=this.realValueToDisplayValue(A,{range:T});return{from:Y,to:W,range:W-Y,realFrom:S,realTo:A,realRange:A-S,displayFrom:z,displayTo:V,displayRange:V-z}},e.prototype.isInCandle=function(){return this.getParent().getId()===j},e.prototype.isFromZero=function(){return"left"===this.position&&this.inside||"right"===this.position&&!this.inside},e.prototype.createTicksImp=function(){var t,e,i=this,r=this.getRange(),n=r.displayFrom,o=r.displayTo,a=r.displayRange,s=[];if(a>=0){var l=function(t){var e=Math.floor(R(t)),i=L(e),r=t/i;return+(t=(r<1.5?1:r<2.5?2:r<3.5?3:r<4.5?4:r<5.5?5:r<6.5?6:8)*i).toFixed(Math.abs(e))}(a/8),u=function(t){var e=t.toString(),i=e.indexOf("e");if(i>0){var r=+e.slice(i+1);return r<0?-r:0}var n=e.indexOf(".");return n<0?0:e.length-1-n}(l),c=B(Math.ceil(n/l)*l,u),h=B(Math.floor(o/l)*l,u),d=0,g=c;if(0!==l)for(;g<=h;){var f=g.toFixed(u);s[d]={text:f,coord:0,value:f},++d,g+=l}}var y=this.getParent(),m=this.getBounding().height,_=y.getChart().getChartStore(),x=[],b=this._getIndicatorsByYAxisIds(),w=_.getStyles(),C=0,E=!1;this._shouldUseCandleData()?C=null!==(e=null===(t=_.getSymbol())||void 0===t?void 0:t.pricePrecision)&&void 0!==e?e:O:b.forEach((function(t){C=Math.max(C,t.precision),E||(E=t.shouldFormatBigNumber)}));var I=_.getInnerFormatter(),T=_.getThousandsSeparator(),S=_.getDecimalFold(),A=w.yAxis.tickText.size,M=NaN;return s.forEach((function(t){var e=t.value,n=i.displayValueToText(+e,C),o=i.convertToPixel(i.realValueToValue(i.displayValueToRealValue(+e,{range:r}),{range:r}));E&&(n=I.formatBigNumber(e)),n=S.format(T.format(n));var a=v(M);o>A&&o<m-A&&(a&&Math.abs(M-o)>2*A||!a)&&(x.push({text:n,coord:o,value:e}),M=o)})),p(this.createTicks)?this.createTicks({range:this.getRange(),bounding:this.getBounding(),defaultTicks:x}):x},e.prototype.getAutoSize=function(){var t,e,i=this.getParent().getChart().getChartStore(),r=i.getStyles(),n=r.yAxis,o=n.size;if("auto"!==o)return o;var a=0;if(n.show&&(n.axisLine.show&&(a+=n.axisLine.size),n.tickLine.show&&(a+=n.tickLine.length),n.tickText.show)){var s=0;this.getTicks().forEach((function(t){s=Math.max(s,S(t.text,n.tickText.size,n.tickText.weight,n.tickText.family))})),a+=n.tickText.marginStart+n.tickText.marginEnd+s}var l=r.candle.priceMark,u=l.show&&l.last.show&&l.last.text.show,c=0,h=r.crosshair,d=h.show&&h.horizontal.show&&h.horizontal.text.show,p=0;if(u||d){var g=null!==(e=null===(t=i.getSymbol())||void 0===t?void 0:t.pricePrecision)&&void 0!==e?e:O,v=this.getRange().displayTo;if(u){var y=i.getDataList(),m=y[y.length-1];if(f(m)){var _=l.last.text,x=_.paddingLeft,b=_.paddingRight,w=_.size,C=_.family,E=_.weight;c=x+S(H(m.close,g),w,E,C)+b;var I=i.getInnerFormatter().formatExtendText;l.last.extendTexts.forEach((function(t,e){var i=I({type:"last_price",data:m,index:e});i.length>0&&t.show&&(c=Math.max(c,t.paddingLeft+S(i,t.size,t.weight,t.family)+t.paddingRight))}))}}if(d){var T=this._getIndicatorsByYAxisIds(),A=0,M=!1;T.forEach((function(t){A=Math.max(t.precision,A),M||(M=t.shouldFormatBigNumber)}));var P=2;if(this._shouldUseCandleData()){var D=r.indicator.lastValueMark;P=D.show&&D.text.show?Math.max(A,g):g}else P=A;var k=H(v,P);M&&(k=i.getInnerFormatter().formatBigNumber(k)),k=i.getDecimalFold().format(k),p+=h.horizontal.text.paddingLeft+h.horizontal.text.paddingRight+2*h.horizontal.text.borderSize+S(k,h.horizontal.text.size,h.horizontal.text.weight,h.horizontal.text.family)}}return Math.max(a,c,p)},e.prototype.getBounding=function(){var t,e;return null!==(e=null===(t=this.getParent().getYAxisWidgetById(this.id))||void 0===t?void 0:t.getBounding())&&void 0!==e?e:this.getParent().getMainWidget().getBounding()},e.prototype.convertFromPixel=function(t){var e=this.getBounding().height,i=this.getRange(),r=i.realFrom,n=i.realRange,o=(this.reverse?t/e:1-t/e)*n+r;return this.realValueToValue(o,{range:i})},e.prototype.convertToPixel=function(t){var e=this.getRange(),i=this.valueToRealValue(t,{range:e}),r=this.getBounding().height,n=(i-e.realFrom)/e.realRange;return this.reverse?Math.round(n*r):Math.round((1-n)*r)},e.prototype.convertToNicePixel=function(t){var e=this.getBounding().height,i=this.convertToPixel(t);return Math.round(Math.max(.05*e,Math.min(i,.98*e)))},e.extend=function(t){var r=function(e){function r(i){return e.call(this,i,t)||this}return i(r,e),r}(e);return r},e}(Q);function tt(){return"undefined"!=typeof window&&window.navigator.userAgent.toLowerCase().includes("firefox")}function et(){return"undefined"!=typeof window&&/iPhone|iPad|iPod|iOS/.test(window.navigator.userAgent)}var it,rt=500,nt=500,ot=500,at=5,st=5,lt=5,ut=30,ct=0,ht=1,dt=2,pt=function(){function t(t,e,i){var r=this;this._clickCount=0,this._clickTimeoutId=null,this._clickCoordinate={x:Number.NEGATIVE_INFINITY,y:Number.POSITIVE_INFINITY},this._tapCount=0,this._tapTimeoutId=null,this._tapCoordinate={x:Number.NEGATIVE_INFINITY,y:Number.POSITIVE_INFINITY},this._longTapTimeoutId=null,this._longTapActive=!1,this._mouseMoveStartCoordinate=null,this._touchMoveStartCoordinate=null,this._touchMoveExceededManhattanDistance=!1,this._cancelClick=!1,this._cancelTap=!1,this._unsubscribeOutsideMouseEvents=null,this._unsubscribeOutsideTouchEvents=null,this._unsubscribeMobileSafariEvents=null,this._unsubscribeMousemove=null,this._unsubscribeMouseWheel=null,this._unsubscribeContextMenu=null,this._unsubscribeRootMouseEvents=null,this._unsubscribeRootTouchEvents=null,this._startPinchMiddleCoordinate=null,this._startPinchDistance=0,this._pinchPrevented=!1,this._preventTouchDragProcess=!1,this._mousePressed=!1,this._lastTouchEventTimeStamp=0,this._activeTouchId=null,this._acceptMouseLeave=!et(),this._onFirefoxOutsideMouseUp=function(t){r._mouseUpHandler(t)},this._onMobileSafariDoubleClick=function(t){r._firesTouchEvents(t)?(++r._tapCount,null!==r._tapTimeoutId&&r._tapCount>1&&(r._mouseTouchMoveWithDownInfo(r._getCoordinate(t),r._tapCoordinate).manhattanDistance<ut&&!r._cancelTap&&r._processEvent(r._makeCompatEvent(t),r._handler.doubleTapEvent),r._resetTapTimeout())):(++r._clickCount,null!==r._clickTimeoutId&&r._clickCount>1&&(r._mouseTouchMoveWithDownInfo(r._getCoordinate(t),r._clickCoordinate).manhattanDistance<lt&&!r._cancelClick&&r._processEvent(r._makeCompatEvent(t),r._handler.mouseDoubleClickEvent),r._resetClickTimeout()))},this._target=t,this._handler=e,this._options=i,this._init()}return t.prototype.destroy=function(){null!==this._unsubscribeOutsideMouseEvents&&(this._unsubscribeOutsideMouseEvents(),this._unsubscribeOutsideMouseEvents=null),null!==this._unsubscribeOutsideTouchEvents&&(this._unsubscribeOutsideTouchEvents(),this._unsubscribeOutsideTouchEvents=null),null!==this._unsubscribeMousemove&&(this._unsubscribeMousemove(),this._unsubscribeMousemove=null),null!==this._unsubscribeMouseWheel&&(this._unsubscribeMouseWheel(),this._unsubscribeMouseWheel=null),null!==this._unsubscribeContextMenu&&(this._unsubscribeContextMenu(),this._unsubscribeContextMenu=null),null!==this._unsubscribeRootMouseEvents&&(this._unsubscribeRootMouseEvents(),this._unsubscribeRootMouseEvents=null),null!==this._unsubscribeRootTouchEvents&&(this._unsubscribeRootTouchEvents(),this._unsubscribeRootTouchEvents=null),null!==this._unsubscribeMobileSafariEvents&&(this._unsubscribeMobileSafariEvents(),this._unsubscribeMobileSafariEvents=null),this._clearLongTapTimeout(),this._resetClickTimeout()},t.prototype._mouseEnterHandler=function(t){var e,i,r,n=this;null===(e=this._unsubscribeMousemove)||void 0===e||e.call(this),null===(i=this._unsubscribeMouseWheel)||void 0===i||i.call(this),null===(r=this._unsubscribeContextMenu)||void 0===r||r.call(this);var o=this._mouseMoveHandler.bind(this);this._unsubscribeMousemove=function(){n._target.removeEventListener("mousemove",o)},this._target.addEventListener("mousemove",o);var a=this._mouseWheelHandler.bind(this);this._unsubscribeMouseWheel=function(){n._target.removeEventListener("wheel",a)},this._target.addEventListener("wheel",a,{passive:!1});var s=this._contextMenuHandler.bind(this);this._unsubscribeContextMenu=function(){n._target.removeEventListener("contextmenu",s)},this._target.addEventListener("contextmenu",s,{passive:!1}),this._firesTouchEvents(t)||(this._processEvent(this._makeCompatEvent(t),this._handler.mouseEnterEvent),this._acceptMouseLeave=!0)},t.prototype._resetClickTimeout=function(){null!==this._clickTimeoutId&&clearTimeout(this._clickTimeoutId),this._clickCount=0,this._clickTimeoutId=null,this._clickCoordinate={x:Number.NEGATIVE_INFINITY,y:Number.POSITIVE_INFINITY}},t.prototype._resetTapTimeout=function(){null!==this._tapTimeoutId&&clearTimeout(this._tapTimeoutId),this._tapCount=0,this._tapTimeoutId=null,this._tapCoordinate={x:Number.NEGATIVE_INFINITY,y:Number.POSITIVE_INFINITY}},t.prototype._mouseMoveHandler=function(t){this._mousePressed||null!==this._touchMoveStartCoordinate||this._firesTouchEvents(t)||(this._processEvent(this._makeCompatEvent(t),this._handler.mouseMoveEvent),this._acceptMouseLeave=!0)},t.prototype._mouseWheelHandler=function(t){if(Math.abs(t.deltaX)>Math.abs(t.deltaY)){if(!f(this._handler.mouseWheelHortEvent))return;if(this._preventDefault(t),0===Math.abs(t.deltaX))return;this._handler.mouseWheelHortEvent(this._makeCompatEvent(t),-t.deltaX)}else{if(!f(this._handler.mouseWheelVertEvent))return;var e=-t.deltaY/100;if(0===e)return;switch(this._preventDefault(t),t.deltaMode){case t.DOM_DELTA_PAGE:e*=120;break;case t.DOM_DELTA_LINE:e*=32}if(0!==e){var i=Math.sign(e)*Math.min(1,Math.abs(e));this._handler.mouseWheelVertEvent(this._makeCompatEvent(t),i)}}},t.prototype._contextMenuHandler=function(t){this._preventDefault(t)},t.prototype._touchMoveHandler=function(t){var e=this._touchWithId(t.changedTouches,this._activeTouchId);if(null!==e&&(this._lastTouchEventTimeStamp=this._eventTimeStamp(t),null===this._startPinchMiddleCoordinate&&!this._preventTouchDragProcess)){this._pinchPrevented=!0;var i=this._mouseTouchMoveWithDownInfo(this._getCoordinate(e),this._touchMoveStartCoordinate),r=i.xOffset,n=i.yOffset,o=i.manhattanDistance;if(this._touchMoveExceededManhattanDistance||!(o<st)){if(!this._touchMoveExceededManhattanDistance){var a=.5*r,s=n>=a&&!this._options.treatVertDragAsPageScroll(),l=a>n&&!this._options.treatHorzDragAsPageScroll();s||l||(this._preventTouchDragProcess=!0),this._touchMoveExceededManhattanDistance=!0,this._cancelTap=!0,this._clearLongTapTimeout(),this._resetTapTimeout()}this._preventTouchDragProcess||(this._processEvent(this._makeCompatEvent(t,e),this._handler.touchMoveEvent),this._preventDefault(t))}}},t.prototype._mouseMoveWithDownHandler=function(t){t.button===ct&&(this._mouseTouchMoveWithDownInfo(this._getCoordinate(t),this._mouseMoveStartCoordinate).manhattanDistance>=at&&(this._cancelClick=!0,this._resetClickTimeout()),this._cancelClick&&this._processEvent(this._makeCompatEvent(t),this._handler.pressedMouseMoveEvent))},t.prototype._mouseTouchMoveWithDownInfo=function(t,e){var i=Math.abs(e.x-t.x),r=Math.abs(e.y-t.y);return{xOffset:i,yOffset:r,manhattanDistance:i+r}},t.prototype._touchEndHandler=function(t){var e=this._touchWithId(t.changedTouches,this._activeTouchId);if(null===e&&0===t.touches.length&&(e=t.changedTouches[0]),null!==e){this._activeTouchId=null,this._lastTouchEventTimeStamp=this._eventTimeStamp(t),this._clearLongTapTimeout(),this._touchMoveStartCoordinate=null,null!==this._unsubscribeRootTouchEvents&&(this._unsubscribeRootTouchEvents(),this._unsubscribeRootTouchEvents=null);var i=this._makeCompatEvent(t,e);if(this._processEvent(i,this._handler.touchEndEvent),++this._tapCount,null!==this._tapTimeoutId&&this._tapCount>1)this._mouseTouchMoveWithDownInfo(this._getCoordinate(e),this._tapCoordinate).manhattanDistance<ut&&!this._cancelTap&&this._processEvent(i,this._handler.doubleTapEvent),this._resetTapTimeout();else this._cancelTap||(this._processEvent(i,this._handler.tapEvent),f(this._handler.tapEvent)&&this._preventDefault(t));0===this._tapCount&&this._preventDefault(t),0===t.touches.length&&this._longTapActive&&(this._longTapActive=!1,this._preventDefault(t))}},t.prototype._mouseUpHandler=function(t){if(t.button===ct){var e=this._makeCompatEvent(t);if(this._mouseMoveStartCoordinate=null,this._mousePressed=!1,null!==this._unsubscribeRootMouseEvents&&(this._unsubscribeRootMouseEvents(),this._unsubscribeRootMouseEvents=null),tt())this._target.ownerDocument.documentElement.removeEventListener("mouseleave",this._onFirefoxOutsideMouseUp);if(!this._firesTouchEvents(t))if(this._processEvent(e,this._handler.mouseUpEvent),++this._clickCount,null!==this._clickTimeoutId&&this._clickCount>1)this._mouseTouchMoveWithDownInfo(this._getCoordinate(t),this._clickCoordinate).manhattanDistance<lt&&!this._cancelClick&&this._processEvent(e,this._handler.mouseDoubleClickEvent),this._resetClickTimeout();else this._cancelClick||this._processEvent(e,this._handler.mouseClickEvent)}},t.prototype._clearLongTapTimeout=function(){null!==this._longTapTimeoutId&&(clearTimeout(this._longTapTimeoutId),this._longTapTimeoutId=null)},t.prototype._touchStartHandler=function(t){if(null===this._activeTouchId){var e=t.changedTouches[0];this._activeTouchId=e.identifier,this._lastTouchEventTimeStamp=this._eventTimeStamp(t);var i=this._target.ownerDocument.documentElement;this._cancelTap=!1,this._touchMoveExceededManhattanDistance=!1,this._preventTouchDragProcess=!1,this._touchMoveStartCoordinate=this._getCoordinate(e),null!==this._unsubscribeRootTouchEvents&&(this._unsubscribeRootTouchEvents(),this._unsubscribeRootTouchEvents=null);var r=this._touchMoveHandler.bind(this),n=this._touchEndHandler.bind(this);this._unsubscribeRootTouchEvents=function(){i.removeEventListener("touchmove",r),i.removeEventListener("touchend",n)},i.addEventListener("touchmove",r,{passive:!1}),i.addEventListener("touchend",n,{passive:!1}),this._clearLongTapTimeout(),this._longTapTimeoutId=setTimeout(this._longTapHandler.bind(this,t),nt),this._processEvent(this._makeCompatEvent(t,e),this._handler.touchStartEvent),null===this._tapTimeoutId&&(this._tapCount=0,this._tapTimeoutId=setTimeout(this._resetTapTimeout.bind(this),rt),this._tapCoordinate=this._getCoordinate(e))}},t.prototype._mouseDownHandler=function(t){if(t.button===dt)return this._preventDefault(t),void this._processEvent(this._makeCompatEvent(t),this._handler.mouseRightClickEvent);if(t.button===ct){var e=this._target.ownerDocument.documentElement;tt()&&e.addEventListener("mouseleave",this._onFirefoxOutsideMouseUp),this._cancelClick=!1,this._mouseMoveStartCoordinate=this._getCoordinate(t),null!==this._unsubscribeRootMouseEvents&&(this._unsubscribeRootMouseEvents(),this._unsubscribeRootMouseEvents=null);var i=this._mouseMoveWithDownHandler.bind(this),r=this._mouseUpHandler.bind(this);this._unsubscribeRootMouseEvents=function(){e.removeEventListener("mousemove",i),e.removeEventListener("mouseup",r)},e.addEventListener("mousemove",i),e.addEventListener("mouseup",r),this._mousePressed=!0,this._firesTouchEvents(t)||(this._processEvent(this._makeCompatEvent(t),this._handler.mouseDownEvent),null===this._clickTimeoutId&&(this._clickCount=0,this._clickTimeoutId=setTimeout(this._resetClickTimeout.bind(this),rt),this._clickCoordinate=this._getCoordinate(t)))}},t.prototype._init=function(){var t=this;this._target.addEventListener("mouseenter",this._mouseEnterHandler.bind(this)),this._target.addEventListener("touchcancel",this._clearLongTapTimeout.bind(this));var e=this._target.ownerDocument,i=function(e){null!=t._handler.mouseDownOutsideEvent&&(e.composed&&t._target.contains(e.composedPath()[0])||null!==e.target&&t._target.contains(e.target)||t._handler.mouseDownOutsideEvent({x:0,y:0,pageX:0,pageY:0}))};this._unsubscribeOutsideTouchEvents=function(){e.removeEventListener("touchstart",i)},this._unsubscribeOutsideMouseEvents=function(){e.removeEventListener("mousedown",i)},e.addEventListener("mousedown",i),e.addEventListener("touchstart",i,{passive:!0}),et()&&(this._unsubscribeMobileSafariEvents=function(){t._target.removeEventListener("dblclick",t._onMobileSafariDoubleClick)},this._target.addEventListener("dblclick",this._onMobileSafariDoubleClick)),this._target.addEventListener("mouseleave",this._mouseLeaveHandler.bind(this)),this._target.addEventListener("touchstart",this._touchStartHandler.bind(this),{passive:!0}),this._target.addEventListener("mousedown",(function(t){if(t.button===ht)return t.preventDefault(),!1})),this._target.addEventListener("mousedown",this._mouseDownHandler.bind(this)),this._initPinch(),this._target.addEventListener("touchmove",(function(){}),{passive:!1})},t.prototype._initPinch=function(){var t=this;(f(this._handler.pinchStartEvent)||f(this._handler.pinchEvent)||f(this._handler.pinchEndEvent))&&(this._target.addEventListener("touchstart",(function(e){t._checkPinchState(e.touches)}),{passive:!0}),this._target.addEventListener("touchmove",(function(e){if(2===e.touches.length&&null!==t._startPinchMiddleCoordinate&&f(t._handler.pinchEvent)){var i=t._getTouchDistance(e.touches[0],e.touches[1])/t._startPinchDistance;t._handler.pinchEvent(r(r({},t._startPinchMiddleCoordinate),{pageX:0,pageY:0}),i),t._preventDefault(e)}}),{passive:!1}),this._target.addEventListener("touchend",(function(e){t._checkPinchState(e.touches)})))},t.prototype._checkPinchState=function(t){1===t.length&&(this._pinchPrevented=!1),2!==t.length||this._pinchPrevented||this._longTapActive?this._stopPinch():this._startPinch(t)},t.prototype._startPinch=function(t){var e=this._target.getBoundingClientRect();this._startPinchMiddleCoordinate={x:(t[0].clientX-e.left+(t[1].clientX-e.left))/2,y:(t[0].clientY-e.top+(t[1].clientY-e.top))/2},this._startPinchDistance=this._getTouchDistance(t[0],t[1]),f(this._handler.pinchStartEvent)&&this._handler.pinchStartEvent({x:0,y:0,pageX:0,pageY:0}),this._clearLongTapTimeout()},t.prototype._stopPinch=function(){null!==this._startPinchMiddleCoordinate&&(this._startPinchMiddleCoordinate=null,f(this._handler.pinchEndEvent)&&this._handler.pinchEndEvent({x:0,y:0,pageX:0,pageY:0}))},t.prototype._mouseLeaveHandler=function(t){var e,i,r;null===(e=this._unsubscribeMousemove)||void 0===e||e.call(this),null===(i=this._unsubscribeMouseWheel)||void 0===i||i.call(this),null===(r=this._unsubscribeContextMenu)||void 0===r||r.call(this),this._firesTouchEvents(t)||this._acceptMouseLeave&&(this._processEvent(this._makeCompatEvent(t),this._handler.mouseLeaveEvent),this._acceptMouseLeave=!et())},t.prototype._longTapHandler=function(t){var e=this._touchWithId(t.touches,this._activeTouchId);null!==e&&(this._processEvent(this._makeCompatEvent(t,e),this._handler.longTapEvent),this._cancelTap=!0,this._longTapActive=!0)},t.prototype._firesTouchEvents=function(t){var e;return f(null===(e=t.sourceCapabilities)||void 0===e?void 0:e.firesTouchEvents)?t.sourceCapabilities.firesTouchEvents:this._eventTimeStamp(t)<this._lastTouchEventTimeStamp+ot},t.prototype._processEvent=function(t,e){null==e||e.call(this._handler,t)},t.prototype._makeCompatEvent=function(t,e){var i=this,r=null!=e?e:t,n=this._target.getBoundingClientRect();return{x:r.clientX-n.left,y:r.clientY-n.top,pageX:r.pageX,pageY:r.pageY,isTouch:!t.type.startsWith("mouse")&&"contextmenu"!==t.type&&"click"!==t.type&&"wheel"!==t.type,preventDefault:function(){"touchstart"!==t.type&&i._preventDefault(t)}}},t.prototype._getTouchDistance=function(t,e){var i=t.clientX-e.clientX,r=t.clientY-e.clientY;return Math.sqrt(i*i+r*r)},t.prototype._preventDefault=function(t){t.cancelable&&t.preventDefault()},t.prototype._getCoordinate=function(t){return{x:t.pageX,y:t.pageY}},t.prototype._eventTimeStamp=function(t){var e;return null!==(e=t.timeStamp)&&void 0!==e?e:performance.now()},t.prototype._touchWithId=function(t,e){for(var i=0;i<t.length;++i)if(t[i].identifier===e)return t[i];return null},t}(),gt={name:"scrollLeft",keys:"Shift+ArrowLeft",action:function(t){var e=t.chart;e.scrollByDistance(-3*e.getBarSpace().bar)}},vt={name:"scrollRight",keys:"Shift+ArrowRight",action:function(t){var e=t.chart;e.scrollByDistance(3*e.getBarSpace().bar)}},ft={name:"zoomIn",keys:["Shift+Equal","Shift+NumpadAdd"],action:function(t){t.chart.zoomAtCoordinate(1.05)}},yt={name:"zoomOut",keys:["Shift+Minus","Shift+NumpadSubtract"],action:function(t){t.chart.zoomAtCoordinate(.95)}},mt=((it={})[gt.name]=gt,it[vt.name]=vt,it[ft.name]=ft,it[yt.name]=yt,it);function _t(t){var e;return null!==(e=mt[t])&&void 0!==e?e:null}function xt(){return Object.keys(mt)}var bt="main",wt="xAxis",Ct="yAxis",Et="separator",It=.975,Tt=1e3/60,St={command:"meta",cmd:"meta",control:"ctrl",option:"alt",mod:/Mac|iPhone|iPad|iPod|iOS/.test(window.navigator.userAgent)?"meta":"ctrl"},At={"+":"equal",plus:"equal",add:"equal",numpadadd:"equal","-":"minus",subtract:"minus",numpadsubtract:"minus",esc:"escape",del:"delete",left:"arrowleft",right:"arrowright",up:"arrowup",down:"arrowdown"},Mt=["ctrl","alt","shift","meta"],Pt=function(){function t(t,e){var i=this;this._flingStartTime=performance.now(),this._flingScrollAnimation=null,this._startScrollCoordinate=null,this._touchCoordinate=null,this._touchCancelCrosshair=!1,this._touchZoomed=!1,this._pinchScale=1,this._mouseDownWidget=null,this._prevYAxisRanges=new Map,this._xAxisStartScaleCoordinate=null,this._xAxisStartScaleDistance=0,this._xAxisScale=1,this._yAxisStartScaleDistance=0,this._mouseMoveTriggerWidgetInfo={pane:null,widget:null},this._boundKeyBoardDownEvent=function(t){var e,r,n,o=t.target,a=null==o?void 0:o.tagName.toLowerCase();if("input"!==a&&"textarea"!==a&&!0!==(null==o?void 0:o.isContentEditable)){var s=i._chart.getHotKey(),c=s.enabled,h=s.exclude;if(c){var g=[];t.ctrlKey&&g.push("ctrl"),t.altKey&&g.push("alt"),t.shiftKey&&g.push("shift"),t.metaKey&&g.push("meta");var v=t.code.trim().toLowerCase();/^key[a-z]$/.test(v)?g.push(v.slice(3)):/^digit[0-9]$/.test(v)?g.push(v.slice(5)):g.push(null!==(e=At[v])&&void 0!==e?e:v);for(var y=g.join("+"),m=xt(),_=m.length-1;_>=0;_--){var x=m[_],b=_t(x);if(!h.includes(x)&&f(b)){var w=(d(b.keys)?b.keys:[b.keys]).some((function(t){var e=[],i="";return t.replace(/\+\+$/,"+Plus").replace(/\+=$/,"+Equal").split("+").forEach((function(t){var r,n,o=(null!==(r=St[t.trim().toLowerCase()])&&void 0!==r?r:t).trim().toLowerCase(),a="";a=/^key[a-z]$/.test(o)?o.slice(3):/^digit[0-9]$/.test(o)?o.slice(5):null!==(n=At[o])&&void 0!==n?n:o,Mt.includes(a)?e.includes(a)||e.push(a):a.length>0&&(i=a)})),e.sort((function(t,e){return Mt.indexOf(t)-Mt.indexOf(e)})),u(u([],l(e),!1),[i],!1).filter((function(t){return t.length>0})).join("+")===y}));if(w){var C={chart:i._chart,event:t,key:y,hotkey:b};if(!p(b.check)||b.check(C))return(null===(r=b.preventDefault)||void 0===r||r)&&t.preventDefault(),null!==(n=b.stopPropagation)&&void 0!==n&&n&&t.stopPropagation(),void b.action(C)}}}}}},this._chart=e,this._event=new pt(t,this,{treatVertDragAsPageScroll:function(){return!1},treatHorzDragAsPageScroll:function(){return!1}}),document.addEventListener("keydown",this._boundKeyBoardDownEvent)}return t.prototype._getYAxisByWidget=function(t){return t.getName()===Ct?t.getAxisComponent():t.getPane().getYAxisComponentById()},t.prototype._getYAxisScaleTargetByWidget=function(t){var e=this._getYAxisByWidget(t),i=t.getPane();return i.isManualYAxis(e.id)?i.getYAxisComponentById():e},t.prototype._syncYAxisValueRange=function(t,e){var i=t.getRange(),r=e.from,n=e.to,o=t.valueToRealValue(r,{range:i}),a=t.valueToRealValue(n,{range:i}),s=t.realValueToDisplayValue(o,{range:i}),l=t.realValueToDisplayValue(a,{range:i});t.setRange({from:r,to:n,range:n-r,realFrom:o,realTo:a,realRange:a-o,displayFrom:s,displayTo:l,displayRange:l-s})},t.prototype._syncManualYAxesValueRange=function(t,e){var i=this,r=e.getRange();t.getPane().getYAxisComponents().forEach((function(n){var o=n;o!==e&&t.getPane().isManualYAxis(o.id)&&i._syncYAxisValueRange(o,r)}))},t.prototype._resetYAxisAndManualYAxes=function(t,e){e.setAutoCalcTickFlag(!0),t.getPane().getYAxisComponents().forEach((function(e){var i=e;t.getPane().isManualYAxis(i.id)&&i.setAutoCalcTickFlag(!0)})),this._chart.layout({measureWidth:!0,update:!0,buildYAxisTick:!0})},t.prototype.pinchStartEvent=function(){return this._touchZoomed=!0,this._pinchScale=1,!0},t.prototype.pinchEvent=function(t,e){void 0===e&&(e=1);var i=this._findWidgetByEvent(t),r=i.pane,n=i.widget;if((null==r?void 0:r.getId())!==K&&(null==n?void 0:n.getName())===bt){var o=this._makeWidgetEvent(t,n),a=5*(e-this._pinchScale);return this._pinchScale=e,this._chart.getChartStore().zoom(a,{x:o.x,y:o.y},"main"),!0}return!1},t.prototype.mouseWheelHortEvent=function(t,e){void 0===e&&(e=0);var i=this._chart.getChartStore();return i.startScroll(),i.scroll(e),!0},t.prototype.mouseWheelVertEvent=function(t,e){void 0===e&&(e=0);var i=this._findWidgetByEvent(t).widget,r=this._makeWidgetEvent(t,i),n=null==i?void 0:i.getName();if(n===bt)return this._chart.getChartStore().zoom(e,{x:r.x,y:r.y},"main"),!0;if(n===Ct){var o=i;if(this._getYAxisByWidget(o).scrollZoomEnabled){var a=1+.05*e,s=this._getYAxisScaleTargetByWidget(o);return this._zoomYAxis(s,a),this._syncManualYAxesValueRange(o,s),!0}}return!1},t.prototype.mouseDownEvent=function(t){var e,i,n=this._findWidgetByEvent(t),o=n.pane,a=n.widget;if(this._mouseDownWidget=a,null!==a){var l=this._makeWidgetEvent(t,a);switch(a.getName()){case Et:return a.dispatchEvent("mouseDownEvent",l);case bt:var u=a.dispatchEvent("mouseDownEvent",l);if(!u){var c=o.getYAxisComponents();try{for(var h=s(c),d=h.next();!d.done;d=h.next()){var p=d.value;if(!p.getAutoCalcTickFlag()){var g=p.getRange();this._prevYAxisRanges.set(p,r({},g))}}}catch(t){e={error:t}}finally{try{d&&!d.done&&(i=h.return)&&i.call(h)}finally{if(e)throw e.error}}this._startScrollCoordinate={x:l.x,y:l.y},this._chart.getChartStore().startScroll()}return u;case wt:return this._processXAxisScrollStartEvent(a,l);case Ct:return this._processYAxisScaleStartEvent(a,l)}}return!1},t.prototype.mouseMoveEvent=function(t){var e,i,r,n=this._findWidgetByEvent(t),o=n.pane,a=n.widget,s=this._makeWidgetEvent(t,a);if((null===(e=this._mouseMoveTriggerWidgetInfo.pane)||void 0===e?void 0:e.getId())===(null==o?void 0:o.getId())&&(null===(i=this._mouseMoveTriggerWidgetInfo.widget)||void 0===i?void 0:i.getName())===(null==a?void 0:a.getName())||(null==a||a.dispatchEvent("mouseEnterEvent",s),null===(r=this._mouseMoveTriggerWidgetInfo.widget)||void 0===r||r.dispatchEvent("mouseLeaveEvent",s),this._mouseMoveTriggerWidgetInfo={pane:o,widget:a}),null!==a)switch(a.getName()){case bt:var l=a.dispatchEvent("mouseMoveEvent",s),u={x:s.x,y:s.y,paneId:null==o?void 0:o.getId()};return l?("pointer"!==a.getForceCursor()&&(u=void 0),a.setCursor("pointer")):a.setCursor("crosshair"),this._chart.getChartStore().setCrosshair(u),l;case Et:case wt:case Ct:l=a.dispatchEvent("mouseMoveEvent",s);return this._chart.getChartStore().setCrosshair(),l}return!1},t.prototype.pressedMouseMoveEvent=function(t){var e,i;if(null!==this._mouseDownWidget&&this._mouseDownWidget.getName()===Et)return this._mouseDownWidget.dispatchEvent("pressedMouseMoveEvent",t);var r=this._findWidgetByEvent(t),n=r.pane,o=r.widget;if(null!==o&&(null===(e=this._mouseDownWidget)||void 0===e?void 0:e.getPane().getId())===(null==n?void 0:n.getId())&&(null===(i=this._mouseDownWidget)||void 0===i?void 0:i.getName())===o.getName()){var a=this._makeWidgetEvent(t,o);switch(o.getName()){case bt:var s=void 0,l=o.dispatchEvent("pressedMouseMoveEvent",a);return l?this._chart.updatePane(1):this._processMainScrollingEvent(o,a),l&&"pointer"!==o.getForceCursor()||(s={x:a.x,y:a.y,paneId:null==n?void 0:n.getId()}),this._chart.getChartStore().setCrosshair(s,{forceInvalidate:!0}),l;case wt:return this._processXAxisScrollingEvent(o,a);case Ct:return this._processYAxisScalingEvent(o,a)}}return!1},t.prototype.mouseUpEvent=function(t){var e=this._findWidgetByEvent(t).widget,i=!1;if(null!==e){var r=this._makeWidgetEvent(t,e);switch(e.getName()){case bt:case Et:case wt:case Ct:i=e.dispatchEvent("mouseUpEvent",r)}i&&this._chart.updatePane(1)}return this._mouseDownWidget=null,this._startScrollCoordinate=null,this._prevYAxisRanges.clear(),this._xAxisStartScaleCoordinate=null,this._xAxisStartScaleDistance=0,this._xAxisScale=1,this._yAxisStartScaleDistance=0,i},t.prototype.mouseClickEvent=function(t){var e=this._findWidgetByEvent(t).widget;if(null!==e){var i=this._makeWidgetEvent(t,e);return e.dispatchEvent("mouseClickEvent",i)}return!1},t.prototype.mouseRightClickEvent=function(t){var e=this._findWidgetByEvent(t).widget,i=!1;if(null!==e){var r=this._makeWidgetEvent(t,e);switch(e.getName()){case bt:case wt:case Ct:i=e.dispatchEvent("mouseRightClickEvent",r)}i&&this._chart.updatePane(1)}return!1},t.prototype.mouseDoubleClickEvent=function(t){var e=this._findWidgetByEvent(t).widget;if(null!==e)switch(e.getName()){case bt:var i=this._makeWidgetEvent(t,e);return e.dispatchEvent("mouseDoubleClickEvent",i);case Ct:var r=e,n=this._getYAxisByWidget(r),o=this._getYAxisScaleTargetByWidget(r);if(!o.getAutoCalcTickFlag()||!n.getAutoCalcTickFlag())return this._resetYAxisAndManualYAxes(r,o),!0}return!1},t.prototype.mouseLeaveEvent=function(){return this._chart.getChartStore().setCrosshair(),!0},t.prototype.touchStartEvent=function(t){var e,i,n,o=this._findWidgetByEvent(t),a=o.pane,l=o.widget;if(null!==l){var u=this._makeWidgetEvent(t,l);switch(null===(n=u.preventDefault)||void 0===n||n.call(u),l.getName()){case bt:var c=this._chart.getChartStore();if(l.dispatchEvent("mouseDownEvent",u))return this._touchCancelCrosshair=!0,this._touchCoordinate=null,c.setCrosshair(void 0,{notInvalidate:!0}),this._chart.updatePane(1),!0;null!==this._flingScrollAnimation&&(this._flingScrollAnimation.cancel(),this._flingScrollAnimation=null),this._flingStartTime=performance.now();var h=a.getYAxisComponents();try{for(var d=s(h),p=d.next();!p.done;p=d.next()){var g=p.value;if(!g.getAutoCalcTickFlag()){var v=g.getRange();this._prevYAxisRanges.set(g,r({},v))}}}catch(t){e={error:t}}finally{try{p&&!p.done&&(i=d.return)&&i.call(d)}finally{if(e)throw e.error}}if(this._startScrollCoordinate={x:u.x,y:u.y},c.startScroll(),this._touchZoomed=!1,null!==this._touchCoordinate){var f=u.x-this._touchCoordinate.x,y=u.y-this._touchCoordinate.y;Math.sqrt(f*f+y*y)<10?(this._touchCoordinate={x:u.x,y:u.y},c.setCrosshair({x:u.x,y:u.y,paneId:null==a?void 0:a.getId()})):(this._touchCoordinate=null,this._touchCancelCrosshair=!0,c.setCrosshair())}return!0;case wt:return this._processXAxisScrollStartEvent(l,u);case Ct:return this._processYAxisScaleStartEvent(l,u)}}return!1},t.prototype.touchMoveEvent=function(t){var e,i,r,n=this._findWidgetByEvent(t),o=n.pane,a=n.widget;if(null!==a){var s=this._makeWidgetEvent(t,a),l=a.getName(),u=this._chart.getChartStore();switch(l){case bt:return a.dispatchEvent("pressedMouseMoveEvent",s)?(null===(e=s.preventDefault)||void 0===e||e.call(s),u.setCrosshair(void 0,{notInvalidate:!0}),this._chart.updatePane(1),!0):(null!==this._touchCoordinate?(null===(i=s.preventDefault)||void 0===i||i.call(s),u.setCrosshair({x:s.x,y:s.y,paneId:null==o?void 0:o.getId()})):this._processMainScrollingEvent(a,s),!0);case wt:return null===(r=s.preventDefault)||void 0===r||r.call(s),this._processXAxisScrollingEvent(a,s);case Ct:return this._processYAxisScalingEvent(a,s)}}return!1},t.prototype.touchEndEvent=function(t){var e=this,i=this._findWidgetByEvent(t).widget;if(null!==i){var r=this._makeWidgetEvent(t,i);switch(i.getName()){case bt:if(i.dispatchEvent("mouseUpEvent",r),null!==this._startScrollCoordinate){var n=performance.now()-this._flingStartTime,o=(r.x-this._startScrollCoordinate.x)/(n>0?n:1)*20;if(n<200&&Math.abs(o)>1){var a=this._chart.getChartStore(),s=Math.log(1/Math.abs(o))/Math.log(It)*Tt,l=new w({duration:s}).doFrame((function(t){var i=t/Tt,r=o*(1-Math.pow(It,i))/(1-It);a.scroll(r),t>=s&&e._flingScrollAnimation===l&&(e._flingScrollAnimation=null)}));a.startScroll(),this._flingScrollAnimation=l,l.start()}}return!0;case wt:case Ct:i.dispatchEvent("mouseUpEvent",r)&&this._chart.updatePane(1)}this._startScrollCoordinate=null,this._prevYAxisRanges.clear(),this._xAxisStartScaleCoordinate=null,this._xAxisStartScaleDistance=0,this._xAxisScale=1,this._yAxisStartScaleDistance=0}return!1},t.prototype.tapEvent=function(t){var e=this._findWidgetByEvent(t),i=e.pane,r=e.widget,n=!1;if(null!==r){var o=this._makeWidgetEvent(t,r),a=r.dispatchEvent("mouseClickEvent",o);if(r.getName()===bt){var s=this._makeWidgetEvent(t,r),l=this._chart.getChartStore();a?(this._touchCancelCrosshair=!0,this._touchCoordinate=null,l.setCrosshair(void 0,{notInvalidate:!0}),n=!0):(this._touchCancelCrosshair||this._touchZoomed||(this._touchCoordinate={x:s.x,y:s.y},l.setCrosshair({x:s.x,y:s.y,paneId:null==i?void 0:i.getId()},{notInvalidate:!0}),n=!0),this._touchCancelCrosshair=!1)}(n||a)&&this._chart.updatePane(1)}return n},t.prototype.doubleTapEvent=function(t){return this.mouseDoubleClickEvent(t)},t.prototype.longTapEvent=function(t){var e=this._findWidgetByEvent(t),i=e.pane,r=e.widget;if(null!==r&&r.getName()===bt){var n=this._makeWidgetEvent(t,r);return this._touchCoordinate={x:n.x,y:n.y},this._chart.getChartStore().setCrosshair({x:n.x,y:n.y,paneId:null==i?void 0:i.getId()}),!0}return!1},t.prototype._processMainScrollingEvent=function(t,e){var i,r,n;if(null!==this._startScrollCoordinate){var o=t.getPane().getYAxisComponents();try{for(var a=s(o),l=a.next();!l.done;l=a.next()){var u=l.value,c=this._prevYAxisRanges.get(u);if(f(c)&&!u.getAutoCalcTickFlag()&&u.scrollZoomEnabled){null===(n=e.preventDefault)||void 0===n||n.call(e);var h=c.from,d=c.to,p=c.range,g=p*((u.reverse?this._startScrollCoordinate.y-e.y:e.y-this._startScrollCoordinate.y)/t.getBounding().height),v=h+g,y=d+g,m=u.valueToRealValue(v,{range:c}),_=u.valueToRealValue(y,{range:c}),x=u.realValueToDisplayValue(m,{range:c}),b=u.realValueToDisplayValue(_,{range:c});u.setRange({from:v,to:y,range:y-v,realFrom:m,realTo:_,realRange:_-m,displayFrom:x,displayTo:b,displayRange:b-x})}}}catch(t){i={error:t}}finally{try{l&&!l.done&&(r=a.return)&&r.call(a)}finally{if(i)throw i.error}}var w=e.x-this._startScrollCoordinate.x;this._chart.getChartStore().scroll(w)}},t.prototype._processXAxisScrollStartEvent=function(t,e){var i=t.dispatchEvent("mouseDownEvent",e);return i&&this._chart.updatePane(1),this._xAxisStartScaleCoordinate={x:e.x,y:e.y},this._xAxisStartScaleDistance=e.pageX,i},t.prototype._processXAxisScrollingEvent=function(t,e){var i=t.dispatchEvent("pressedMouseMoveEvent",e);if(i)this._chart.updatePane(1);else if(t.getPane().getXAxisComponent().scrollZoomEnabled&&0!==this._xAxisStartScaleDistance){var r=this._xAxisStartScaleDistance/e.pageX;if(Number.isFinite(r)){var n=10*(r-this._xAxisScale);this._xAxisScale=r,this._chart.getChartStore().zoom(n,this._xAxisStartScaleCoordinate,"xAxis")}}return i},t.prototype._processYAxisScaleStartEvent=function(t,e){var i=t.dispatchEvent("mouseDownEvent",e);i&&this._chart.updatePane(1);var n=this._getYAxisScaleTargetByWidget(t),o=n.getRange();return this._prevYAxisRanges.set(n,r({},o)),this._yAxisStartScaleDistance=e.pageY,i},t.prototype._processYAxisScalingEvent=function(t,e){var i,r=t.dispatchEvent("pressedMouseMoveEvent",e);if(r)this._chart.updatePane(1);else{var n=this._getYAxisByWidget(t),o=this._getYAxisScaleTargetByWidget(t),a=this._prevYAxisRanges.get(o);if(f(a)&&n.scrollZoomEnabled&&0!==this._yAxisStartScaleDistance){null===(i=e.preventDefault)||void 0===i||i.call(e);var s=e.pageY/this._yAxisStartScaleDistance;this._zoomYAxis(o,s,a),this._syncManualYAxesValueRange(t,o)}}return r},t.prototype._zoomYAxis=function(t,e,i){var r=null!=i?i:t.getRange(),n=r.from,o=r.to,a=r.range,s=a*e,l=(s-a)/2,u=n-l,c=o+l,h=t.valueToRealValue(u,{range:r}),d=t.valueToRealValue(c,{range:r}),p=t.realValueToDisplayValue(h,{range:r}),g=t.realValueToDisplayValue(d,{range:r});t.setRange({from:u,to:c,range:s,realFrom:h,realTo:d,realRange:d-h,displayFrom:p,displayTo:g,displayRange:g-p}),this._chart.layout({measureWidth:!0,update:!0,buildYAxisTick:!0})},t.prototype._findWidgetByEvent=function(t){var e,i,r,n,o,a,l=t.x,u=t.y,c=this._chart.getSeparatorPanes(),h=this._chart.getStyles().separator.size;try{for(var d=s(c),p=d.next();!p.done;p=d.next()){var g=p.value[1],v=(b=g.getBounding()).top-Math.round((7-h)/2);if(l>=b.left&&l<=b.left+b.width&&u>=v&&u<=v+7)return{pane:g,widget:g.getWidget()}}}catch(t){e={error:t}}finally{try{p&&!p.done&&(i=d.return)&&i.call(d)}finally{if(e)throw e.error}}var y=this._chart.getDrawPanes(),m=null;try{for(var _=s(y),x=_.next();!x.done;x=_.next()){var b,w=x.value;if(l>=(b=w.getBounding()).left&&l<=b.left+b.width&&u>=b.top&&u<=b.top+b.height){m=w;break}}}catch(t){r={error:t}}finally{try{x&&!x.done&&(n=_.return)&&n.call(_)}finally{if(r)throw r.error}}var C=null;if(null!==m){if(!f(C)){var E=m.getMainWidget(),I=E.getBounding();l>=I.left&&l<=I.left+I.width&&u>=I.top&&u<=I.top+I.height&&(C=E)}if(!f(C))try{for(var T=s(m.getYAxisWidgets()),S=T.next();!S.done;S=T.next()){var A=S.value,M=A.getBounding();if(l>=M.left&&l<=M.left+M.width&&u>=M.top&&u<=M.top+M.height){C=A;break}}}catch(t){o={error:t}}finally{try{S&&!S.done&&(a=T.return)&&a.call(T)}finally{if(o)throw o.error}}}return{pane:m,widget:C}},t.prototype._makeWidgetEvent=function(t,e){var i,n,o,a=null!==(i=null==e?void 0:e.getBounding())&&void 0!==i?i:null;return r(r({},t),{x:t.x-(null!==(n=null==a?void 0:a.left)&&void 0!==n?n:0),y:t.y-(null!==(o=null==a?void 0:a.top)&&void 0!==o?o:0)})},t.prototype.destroy=function(){var t;null===(t=this._flingScrollAnimation)||void 0===t||t.cancel(),this._flingScrollAnimation=null,document.removeEventListener("keydown",this._boundKeyBoardDownEvent),this._event.destroy()},t}();function Dt(t,e,i,n,o){var a,s=t.result,l=t.figures,u=t.styles,c=V(u,"texts",n.texts),h=c.length,d=V(u,"circles",n.circles),p=d.length,g=V(u,"bars",n.bars),v=g.length,y=V(u,"lines",n.lines),m=y.length,_=0,x=0,b=0,w=0,C=0;l.forEach((function(l){var u;switch(l.type){case"text":C=_,a=c[_%h],_++;break;case"circle":C=x;var E=d[x%p];a=r(r({},E),{color:E.noChangeColor}),x++;break;case"bar":C=b;var I=g[b%v];a=r(r({},I),{color:I.noChangeColor}),b++;break;case"line":C=w,a=y[w%m],w++}if(f(l.type)){var T=null===(u=l.styles)||void 0===u?void 0:u.call(l,{data:{prev:s[e-1],current:s[e],next:s[e+1]},indicator:t,barSpace:i,defaultStyles:n});o(l,r(r({},a),T),C)}}))}var kt=function(){function t(t){this.precision=4,this.calcParams=[],this.shouldOhlc=!1,this.shouldFormatBigNumber=!1,this.visible=!0,this.zLevel=0,this.series="normal",this.figures=[],this.minValue=null,this.maxValue=null,this.styles=null,this.shouldUpdate=function(t,e){var i=JSON.stringify(t.calcParams)!==JSON.stringify(e.calcParams)||t.figures!==e.figures||t.calc!==e.calc;return{calc:i,draw:i||t.shortName!==e.shortName||t.paneId!==e.paneId||t.yAxisId!==e.yAxisId||t.series!==e.series||t.minValue!==e.minValue||t.maxValue!==e.maxValue||t.precision!==e.precision||t.shouldOhlc!==e.shouldOhlc||t.shouldFormatBigNumber!==e.shouldFormatBigNumber||t.visible!==e.visible||t.zLevel!==e.zLevel||t.extendData!==e.extendData||t.regenerateFigures!==e.regenerateFigures||t.createTooltipDataSource!==e.createTooltipDataSource||t.draw!==e.draw}},this.calc=function(){return[]},this.regenerateFigures=null,this.createTooltipDataSource=null,this.draw=null,this.result=[],this._lockSeriesPrecision=!1,this.override(t),this._lockSeriesPrecision=!1}return t.prototype.override=function(t){var e,i,o=this,a=o.result;o._prevIndicator;var s=n(o,["result","_prevIndicator"]);this._prevIndicator=r(r({},h(s)),{result:a});var l=t.id,u=t.name,d=t.shortName,g=t.precision,y=t.styles,_=t.figures,x=t.calcParams,b=n(t,["id","name","shortName","precision","styles","figures","calcParams"]);!m(this.id)&&m(l)&&(this.id=l),m(this.name)||(this.name=null!=u?u:""),this.shortName=null!==(e=null!=d?d:this.shortName)&&void 0!==e?e:this.name,v(g)&&(this.precision=g,this._lockSeriesPrecision=!0),f(y)&&(null!==(i=this.styles)&&void 0!==i||(this.styles={}),c(this.styles,y)),c(this,b),f(x)&&(this.calcParams=x,p(this.regenerateFigures)&&(this.figures=this.regenerateFigures(this.calcParams))),this.figures=null!=_?_:this.figures},t.prototype.setSeriesPrecision=function(t){this._lockSeriesPrecision||(this.precision=t)},t.prototype.shouldUpdateImp=function(){var t=this._prevIndicator.zLevel!==this.zLevel,e=this.shouldUpdate(this._prevIndicator,this);return y(e)?{calc:e,draw:e,sort:t}:r(r({},e),{sort:t})},t.prototype.calcImp=function(t){return o(this,void 0,void 0,(function(){var e;return a(this,(function(i){switch(i.label){case 0:return i.trys.push([0,2,,3]),[4,this.calc(t,this)];case 1:return e=i.sent(),this.result=e,[2,!0];case 2:return i.sent(),[2,!1];case 3:return[2]}}))}))},t.extend=function(e){return function(t){function r(){return t.call(this,e)||this}return i(r,t),r}(t)},t}(),Bt={name:"AO",shortName:"AO",calcParams:[5,34],figures:[{key:"ao",title:"AO: ",type:"bar",baseValue:0,styles:function(t){var e,i,r=t.data,n=t.indicator,o=t.defaultStyles,a=r.prev,s=r.current,l=null!==(e=null==a?void 0:a.ao)&&void 0!==e?e:Number.MIN_SAFE_INTEGER,u=null!==(i=null==s?void 0:s.ao)&&void 0!==i?i:Number.MIN_SAFE_INTEGER,c="";return{color:c=u>l?V(n.styles,"bars[0].upColor",o.bars[0].upColor):V(n.styles,"bars[0].downColor",o.bars[0].downColor),style:u>l?"stroke":"fill",borderColor:c}}}],calc:function(t,e){var i=e.calcParams,r=Math.max(i[0],i[1]),n=0,o=0,a=0,s=0;return t.map((function(e,l){var u={},c=(e.low+e.high)/2;if(n+=c,o+=c,l>=i[0]-1){a=n/i[0];var h=t[l-(i[0]-1)];n-=(h.low+h.high)/2}if(l>=i[1]-1){s=o/i[1];h=t[l-(i[1]-1)];o-=(h.low+h.high)/2}return l>=r-1&&(u.ao=a-s),u}))}};var Ft={name:"BOLL",shortName:"BOLL",series:"price",calcParams:[20,2],precision:2,shouldOhlc:!0,figures:[{key:"up",title:"UP: ",type:"line"},{key:"mid",title:"MID: ",type:"line"},{key:"dn",title:"DN: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=i[0]-1,n=0;return t.map((function(e,o){var a=e.close,s={};if(n+=a,o>=r){s.mid=n/i[0];var l=function(t,e){var i=t.length,r=0;return t.forEach((function(t){var i=t.close-e;r+=i*i})),r=Math.abs(r),Math.sqrt(r/i)}(t.slice(o-r,o+1),s.mid);s.up=s.mid+i[1]*l,s.dn=s.mid-i[1]*l,n-=t[o-r].close}return s}))}},Rt={name:"BBI",shortName:"BBI",series:"price",precision:2,calcParams:[3,6,12,24],shouldOhlc:!0,figures:[{key:"bbi",title:"BBI: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=Math.max.apply(Math,u([],l(i),!1)),n=[],o=[];return t.map((function(e,a){var s={},l=e.close;if(i.forEach((function(e,i){var r;n[i]=(null!==(r=n[i])&&void 0!==r?r:0)+l,a>=e-1&&(o[i]=n[i]/e,n[i]-=t[a-(e-1)].close)})),a>=r-1){var u=0;o.forEach((function(t){u+=t})),s.bbi=u/4}return s}))}},Lt={name:"CCI",shortName:"CCI",calcParams:[20],figures:[{key:"cci",title:"CCI: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=i[0]-1,n=0,o=[];return t.map((function(e,a){var s={},l=(e.high+e.low+e.close)/3;if(n+=l,o.push(l),a>=r){var u=n/i[0],c=o.slice(a-r,a+1),h=0;c.forEach((function(t){h+=Math.abs(t-u)}));var d=h/i[0];s.cci=0!==d?(l-u)/d/.015:0;var p=(t[a-r].high+t[a-r].low+t[a-r].close)/3;n-=p}return s}))}},Ot={name:"CR",shortName:"CR",calcParams:[26,10,20,40,60],figures:[{key:"cr",title:"CR: ",type:"line"},{key:"ma1",title:"MA1: ",type:"line"},{key:"ma2",title:"MA2: ",type:"line"},{key:"ma3",title:"MA3: ",type:"line"},{key:"ma4",title:"MA4: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=Math.ceil(i[1]/2.5+1),n=Math.ceil(i[2]/2.5+1),o=Math.ceil(i[3]/2.5+1),a=Math.ceil(i[4]/2.5+1),s=0,l=[],u=0,c=[],h=0,d=[],p=0,g=[],v=[];return t.forEach((function(e,f){var y,m,_,x,b,w={},C=null!==(y=t[f-1])&&void 0!==y?y:e,E=(C.high+C.low)/2,I=Math.max(0,e.high-E),T=Math.max(0,E-e.low);f>=i[0]-1&&(w.cr=0!==T?I/T*100:0,s+=w.cr,u+=w.cr,h+=w.cr,p+=w.cr,f>=i[0]+i[1]-2&&(l.push(s/i[1]),f>=i[0]+i[1]+r-3&&(w.ma1=l[l.length-1-r]),s-=null!==(m=v[f-(i[1]-1)].cr)&&void 0!==m?m:0),f>=i[0]+i[2]-2&&(c.push(u/i[2]),f>=i[0]+i[2]+n-3&&(w.ma2=c[c.length-1-n]),u-=null!==(_=v[f-(i[2]-1)].cr)&&void 0!==_?_:0),f>=i[0]+i[3]-2&&(d.push(h/i[3]),f>=i[0]+i[3]+o-3&&(w.ma3=d[d.length-1-o]),h-=null!==(x=v[f-(i[3]-1)].cr)&&void 0!==x?x:0),f>=i[0]+i[4]-2&&(g.push(p/i[4]),f>=i[0]+i[4]+a-3&&(w.ma4=g[g.length-1-a]),p-=null!==(b=v[f-(i[4]-1)].cr)&&void 0!==b?b:0)),v.push(w)})),v}},Yt={name:"DMA",shortName:"DMA",calcParams:[10,50,10],figures:[{key:"dma",title:"DMA: ",type:"line"},{key:"ama",title:"AMA: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=Math.max(i[0],i[1]),n=0,o=0,a=0,s=[];return t.forEach((function(e,l){var u,c={},h=e.close;n+=h,o+=h;var d=0,p=0;if(l>=i[0]-1&&(d=n/i[0],n-=t[l-(i[0]-1)].close),l>=i[1]-1&&(p=o/i[1],o-=t[l-(i[1]-1)].close),l>=r-1){var g=d-p;c.dma=g,a+=g,l>=r+i[2]-2&&(c.ama=a/i[2],a-=null!==(u=s[l-(i[2]-1)].dma)&&void 0!==u?u:0)}s.push(c)})),s}},Wt={name:"DMI",shortName:"DMI",calcParams:[14,6],figures:[{key:"pdi",title:"PDI: ",type:"line"},{key:"mdi",title:"MDI: ",type:"line"},{key:"adx",title:"ADX: ",type:"line"},{key:"adxr",title:"ADXR: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=0,n=0,o=0,a=0,s=0,l=0,u=0,c=0,h=[];return t.forEach((function(e,d){var p,g,v={},f=null!==(p=t[d-1])&&void 0!==p?p:e,y=f.close,m=e.high,_=e.low,x=m-_,b=Math.abs(m-y),w=Math.abs(y-_),C=m-f.high,E=f.low-_,I=Math.max(Math.max(x,b),w),T=C>0&&C>E?C:0,S=E>0&&E>C?E:0;if(r+=I,n+=T,o+=S,d>=i[0]-1){d>i[0]-1?(a=a-a/i[0]+I,s=s-s/i[0]+T,l=l-l/i[0]+S):(a=r,s=n,l=o);var A=0,M=0;0!==a&&(A=100*s/a,M=100*l/a),v.pdi=A,v.mdi=M;var P=0;M+A!==0&&(P=Math.abs(M-A)/(M+A)*100),u+=P,d>=2*i[0]-2&&(c=d>2*i[0]-2?(c*(i[0]-1)+P)/i[0]:u/i[0],v.adx=c,d>=2*i[0]+i[1]-3&&(v.adxr=((null!==(g=h[d-(i[1]-1)].adx)&&void 0!==g?g:0)+c)/2))}h.push(v)})),h}},zt={name:"MACD",shortName:"MACD",calcParams:[12,26,9],figures:[{key:"dif",title:"DIF: ",type:"line"},{key:"dea",title:"DEA: ",type:"line"},{key:"macd",title:"MACD: ",type:"bar",baseValue:0,styles:function(t){var e,i,r=t.data,n=t.indicator,o=t.defaultStyles,a=r.prev,s=r.current,l=null!==(e=null==a?void 0:a.macd)&&void 0!==e?e:Number.MIN_SAFE_INTEGER,u=null!==(i=null==s?void 0:s.macd)&&void 0!==i?i:Number.MIN_SAFE_INTEGER,c="";return{style:l<u?"stroke":"fill",color:c=u>0?V(n.styles,"bars[0].upColor",o.bars[0].upColor):u<0?V(n.styles,"bars[0].downColor",o.bars[0].downColor):V(n.styles,"bars[0].noChangeColor",o.bars[0].noChangeColor),borderColor:c}}}],calc:function(t,e){var i=e.calcParams,r=0,n=0,o=0,a=0,s=0,l=0,u=Math.max(i[0],i[1]);return t.map((function(t,e){var c={},h=t.close;return r+=h,e>=i[0]-1&&(n=e>i[0]-1?(2*h+(i[0]-1)*n)/(i[0]+1):r/i[0]),e>=i[1]-1&&(o=e>i[1]-1?(2*h+(i[1]-1)*o)/(i[1]+1):r/i[1]),e>=u-1&&(a=n-o,c.dif=a,s+=a,e>=u+i[2]-2&&(l=e>u+i[2]-2?(2*a+l*(i[2]-1))/(i[2]+1):s/i[2],c.macd=2*(a-l),c.dea=l)),c}))}},Vt={name:"RSI",shortName:"RSI",calcParams:[6,12,24],figures:[{key:"rsi1",title:"RSI1: ",type:"line"},{key:"rsi2",title:"RSI2: ",type:"line"},{key:"rsi3",title:"RSI3: ",type:"line"}],regenerateFigures:function(t){return t.map((function(t,e){var i=e+1;return{key:"rsi".concat(i),title:"RSI".concat(i,": "),type:"line"}}))},calc:function(t,e){var i=e.calcParams,r=e.figures,n=[],o=[],a=[],s=[];return t.map((function(e,l){var u={},c=0===l?0:e.close-t[l-1].close,h=Math.max(c,0),d=Math.max(-c,0);return i.forEach((function(t,e){var i,c;n[e]=(null!==(i=n[e])&&void 0!==i?i:0)+h,o[e]=(null!==(c=o[e])&&void 0!==c?c:0)+d,l<t||(void 0===a[e]||void 0===s[e]?(a[e]=n[e]/t,s[e]=o[e]/t):(a[e]=(a[e]*(t-1)+h)/t,s[e]=(s[e]*(t-1)+d)/t),0===s[e]?u[r[e].key]=100:0===a[e]?u[r[e].key]=0:u[r[e].key]=100-100/(1+a[e]/s[e]))})),u}))}},Nt={name:"KDJ",shortName:"KDJ",calcParams:[9,3,3],figures:[{key:"k",title:"K: ",type:"line"},{key:"d",title:"D: ",type:"line"},{key:"j",title:"J: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=[];return t.forEach((function(e,n){var o,a,s,l,u={},c=e.close;if(n>=i[0]-1){var h=F(t.slice(n-(i[0]-1),n+1),"high","low"),d=h[0],p=h[1],g=d-p,v=(c-p)/(0===g?1:g)*100;u.k=((i[1]-1)*(null!==(a=null===(o=r[n-1])||void 0===o?void 0:o.k)&&void 0!==a?a:50)+v)/i[1],u.d=((i[2]-1)*(null!==(l=null===(s=r[n-1])||void 0===s?void 0:s.d)&&void 0!==l?l:50)+u.k)/i[2],u.j=3*u.k-2*u.d}r.push(u)})),r}},Ht={name:"SAR",shortName:"SAR",series:"price",calcParams:[2,2,20],precision:2,shouldOhlc:!0,figures:[{key:"sar",title:"SAR: ",type:"circle",styles:function(t){var e,i,r,n=t.data,o=t.indicator,a=t.defaultStyles,s=n.current;return{color:(null!==(e=null==s?void 0:s.sar)&&void 0!==e?e:Number.MIN_SAFE_INTEGER)<((null!==(i=null==s?void 0:s.high)&&void 0!==i?i:0)+(null!==(r=null==s?void 0:s.low)&&void 0!==r?r:0))/2?V(o.styles,"circles[0].upColor",a.circles[0].upColor):V(o.styles,"circles[0].downColor",a.circles[0].downColor)}}}],calc:function(t,e){var i=e.calcParams,r=i[0]/100,n=i[1]/100,o=i[2]/100,a=r,s=-100,l=!1,u=0;return t.map((function(e,i){var c=u,h=e.high,d=e.low;if(l){(-100===s||s<h)&&(s=h,a=Math.min(a+n,o)),u=c+a*(s-c);var p=Math.min(t[Math.max(1,i)-1].low,d);u>e.low?(u=s,a=r,s=-100,l=!l):u>p&&(u=p)}else{(-100===s||s>d)&&(s=d,a=Math.min(a+n,o)),u=c+a*(s-c);var g=Math.max(t[Math.max(1,i)-1].high,h);u<e.high?(u=s,a=r,s=-100,l=!l):u<g&&(u=g)}return{high:h,low:d,sar:u}}))}};function Xt(){return{key:"volume",title:"VOLUME: ",type:"bar",baseValue:0,styles:function(t){var e=t.data,i=t.indicator,r=t.defaultStyles,n=e.current,o=V(i.styles,"bars[0].noChangeColor",r.bars[0].noChangeColor);return f(n)&&(n.close>n.open?o=V(i.styles,"bars[0].upColor",r.bars[0].upColor):n.close<n.open&&(o=V(i.styles,"bars[0].downColor",r.bars[0].downColor))),{color:o}}}}var Ut={name:"VOL",shortName:"VOL",series:"volume",calcParams:[5,10,20],shouldFormatBigNumber:!0,precision:0,minValue:0,figures:[{key:"ma1",title:"MA5: ",type:"line"},{key:"ma2",title:"MA10: ",type:"line"},{key:"ma3",title:"MA20: ",type:"line"},Xt()],regenerateFigures:function(t){var e=t.map((function(t,e){return{key:"ma".concat(e+1),title:"MA".concat(t,": "),type:"line"}}));return e.push(Xt()),e},calc:function(t,e){var i=e.calcParams,r=e.figures,n=[];return t.map((function(e,o){var a,s=null!==(a=e.volume)&&void 0!==a?a:0,l={volume:s,open:e.open,close:e.close};return i.forEach((function(e,i){var a,u;n[i]=(null!==(a=n[i])&&void 0!==a?a:0)+s,o>=e-1&&(l[r[i].key]=n[i]/e,n[i]-=null!==(u=t[o-(e-1)].volume)&&void 0!==u?u:0)})),l}))}},Gt={name:"WR",shortName:"WR",calcParams:[6,10,14],figures:[{key:"wr1",title:"WR1: ",type:"line"},{key:"wr2",title:"WR2: ",type:"line"},{key:"wr3",title:"WR3: ",type:"line"}],regenerateFigures:function(t){return t.map((function(t,e){return{key:"wr".concat(e+1),title:"WR".concat(e+1,": "),type:"line"}}))},calc:function(t,e){var i=e.calcParams,r=e.figures;return t.map((function(e,n){var o={},a=e.close;return i.forEach((function(e,i){var s=e-1;if(n>=s){var l=F(t.slice(n-s,n+1),"high","low"),u=l[0],c=u-l[1];o[r[i].key]=0===c?0:(a-u)/c*100}})),o}))}},Zt={},jt=[{name:"AVP",shortName:"AVP",series:"price",precision:2,figures:[{key:"avp",title:"AVP: ",type:"line"}],calc:function(t){var e=0,i=0;return t.map((function(t){var r,n,o={},a=null!==(r=t.turnover)&&void 0!==r?r:0,s=null!==(n=t.volume)&&void 0!==n?n:0;return e+=a,0!==(i+=s)&&(o.avp=e/i),o}))}},Bt,{name:"BIAS",shortName:"BIAS",calcParams:[6,12,24],figures:[{key:"bias1",title:"BIAS6: ",type:"line"},{key:"bias2",title:"BIAS12: ",type:"line"},{key:"bias3",title:"BIAS24: ",type:"line"}],regenerateFigures:function(t){return t.map((function(t,e){return{key:"bias".concat(e+1),title:"BIAS".concat(t,": "),type:"line"}}))},calc:function(t,e){var i=e.calcParams,r=e.figures,n=[];return t.map((function(e,o){var a={},s=e.close;return i.forEach((function(e,l){var u;if(n[l]=(null!==(u=n[l])&&void 0!==u?u:0)+s,o>=e-1){var c=n[l]/i[l];a[r[l].key]=(s-c)/c*100,n[l]-=t[o-(e-1)].close}})),a}))}},Ft,{name:"BRAR",shortName:"BRAR",calcParams:[26],figures:[{key:"br",title:"BR: ",type:"line"},{key:"ar",title:"AR: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=0,n=0,o=0,a=0;return t.map((function(e,s){var l,u,c={},h=e.high,d=e.low,p=e.open,g=(null!==(l=t[s-1])&&void 0!==l?l:e).close;if(o+=h-p,a+=p-d,r+=h-g,n+=g-d,s>=i[0]-1){c.ar=0!==a?o/a*100:0,c.br=0!==n?r/n*100:0;var v=t[s-(i[0]-1)],f=v.high,y=v.low,m=v.open,_=(null!==(u=t[s-i[0]])&&void 0!==u?u:t[s-(i[0]-1)]).close;r-=f-_,n-=_-y,o-=f-m,a-=m-y}return c}))}},Rt,Lt,Ot,Yt,Wt,{name:"EMV",shortName:"EMV",calcParams:[14,9],figures:[{key:"emv",title:"EMV: ",type:"line"},{key:"maEmv",title:"MAEMV: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=0,n=[];return t.map((function(e,o){var a,s={};if(o>0){var l=t[o-1],u=e.high,c=e.low,h=null!==(a=e.volume)&&void 0!==a?a:0,d=(u+c)/2-(l.high+l.low)/2;if(0===h||u-c==0)s.emv=0;else{var p=h/1e8/(u-c);s.emv=d/p}r+=s.emv,n.push(s.emv),o>=i[0]&&(s.maEmv=r/i[0],r-=n[o-i[0]])}return s}))}},{name:"EMA",shortName:"EMA",series:"price",calcParams:[6,12,20],precision:2,shouldOhlc:!0,figures:[{key:"ema1",title:"EMA6: ",type:"line"},{key:"ema2",title:"EMA12: ",type:"line"},{key:"ema3",title:"EMA20: ",type:"line"}],regenerateFigures:function(t){return t.map((function(t,e){return{key:"ema".concat(e+1),title:"EMA".concat(t,": "),type:"line"}}))},calc:function(t,e){var i=e.calcParams,r=e.figures,n=0,o=[];return t.map((function(t,e){var a={},s=t.close;return n+=s,i.forEach((function(t,i){e>=t-1&&(o[i]=e>t-1?(2*s+(t-1)*o[i])/(t+1):n/t,a[r[i].key]=o[i])})),a}))}},{name:"MTM",shortName:"MTM",calcParams:[12,6],figures:[{key:"mtm",title:"MTM: ",type:"line"},{key:"maMtm",title:"MAMTM: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=0,n=[];return t.forEach((function(e,o){var a,s={};if(o>=i[0]){var l=e.close,u=t[o-i[0]].close;s.mtm=l-u,r+=s.mtm,o>=i[0]+i[1]-1&&(s.maMtm=r/i[1],r-=null!==(a=n[o-(i[1]-1)].mtm)&&void 0!==a?a:0)}n.push(s)})),n}},{name:"MA",shortName:"MA",series:"price",calcParams:[5,10,30,60],precision:2,shouldOhlc:!0,figures:[{key:"ma1",title:"MA5: ",type:"line"},{key:"ma2",title:"MA10: ",type:"line"},{key:"ma3",title:"MA30: ",type:"line"},{key:"ma4",title:"MA60: ",type:"line"}],regenerateFigures:function(t){return t.map((function(t,e){return{key:"ma".concat(e+1),title:"MA".concat(t,": "),type:"line"}}))},calc:function(t,e){var i=e.calcParams,r=e.figures,n=[];return t.map((function(e,o){var a={},s=e.close;return i.forEach((function(e,i){var l;n[i]=(null!==(l=n[i])&&void 0!==l?l:0)+s,o>=e-1&&(a[r[i].key]=n[i]/e,n[i]-=t[o-(e-1)].close)})),a}))}},zt,{name:"OBV",shortName:"OBV",calcParams:[30],figures:[{key:"obv",title:"OBV: ",type:"line"},{key:"maObv",title:"MAOBV: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=0,n=0,o=[];return t.forEach((function(e,a){var s,l,u,c,h=null!==(s=t[a-1])&&void 0!==s?s:e;e.close<h.close?n-=null!==(l=e.volume)&&void 0!==l?l:0:e.close>h.close&&(n+=null!==(u=e.volume)&&void 0!==u?u:0);var d={obv:n};r+=n,a>=i[0]-1&&(d.maObv=r/i[0],r-=null!==(c=o[a-(i[0]-1)].obv)&&void 0!==c?c:0),o.push(d)})),o}},{name:"PVT",shortName:"PVT",figures:[{key:"pvt",title:"PVT: ",type:"line"}],calc:function(t){var e=0;return t.map((function(i,r){var n,o,a={},s=i.close,l=null!==(n=i.volume)&&void 0!==n?n:1,u=(null!==(o=t[r-1])&&void 0!==o?o:i).close,c=0;return 0!==u&&(c=(s-u)/u*l),e+=c,a.pvt=e,a}))}},{name:"PSY",shortName:"PSY",calcParams:[12,6],figures:[{key:"psy",title:"PSY: ",type:"line"},{key:"maPsy",title:"MAPSY: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=0,n=0,o=[],a=[];return t.forEach((function(e,s){var l,u,c={},h=(null!==(l=t[s-1])&&void 0!==l?l:e).close,d=e.close-h>0?1:0;o.push(d),r+=d,s>=i[0]-1&&(c.psy=r/i[0]*100,n+=c.psy,s>=i[0]+i[1]-2&&(c.maPsy=n/i[1],n-=null!==(u=a[s-(i[1]-1)].psy)&&void 0!==u?u:0),r-=o[s-(i[0]-1)]),a.push(c)})),a}},{name:"ROC",shortName:"ROC",calcParams:[12,6],figures:[{key:"roc",title:"ROC: ",type:"line"},{key:"maRoc",title:"MAROC: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=[],n=0;return t.forEach((function(e,o){var a,s={};if(o>=i[0]){var l=e.close,u=t[o-i[0]].close;s.roc=0!==u?(l-u)/u*100:0,n+=s.roc,o>=i[0]+i[1]-1&&(s.maRoc=n/i[1],n-=null!==(a=r[o-(i[1]-1)].roc)&&void 0!==a?a:0)}r.push(s)})),r}},Vt,{name:"SMA",shortName:"SMA",series:"price",calcParams:[12,2],precision:2,figures:[{key:"sma",title:"SMA: ",type:"line"}],shouldOhlc:!0,calc:function(t,e){var i=e.calcParams,r=0,n=0;return t.map((function(t,e){var o={},a=t.close;return r+=a,e>=i[0]-1&&(n=e>i[0]-1?(a*i[1]+n*(i[0]-i[1]+1))/(i[0]+1):r/i[0],o.sma=n),o}))}},Nt,Ht,{name:"TRIX",shortName:"TRIX",calcParams:[12,9],figures:[{key:"trix",title:"TRIX: ",type:"line"},{key:"maTrix",title:"MATRIX: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=0,n=0,o=0,a=0,s=0,l=0,u=0,c=[];return t.forEach((function(t,e){var h,d={},p=t.close;if(r+=p,e>=i[0]-1&&(n=e>i[0]-1?(2*p+(i[0]-1)*n)/(i[0]+1):r/i[0],s+=n,e>=2*i[0]-2&&(o=e>2*i[0]-2?(2*n+(i[0]-1)*o)/(i[0]+1):s/i[0],l+=o,e>=3*i[0]-3))){var g=0,v=0;e>3*i[0]-3?v=((g=(2*o+(i[0]-1)*a)/(i[0]+1))-a)/a*100:g=l/i[0],a=g,d.trix=v,u+=v,e>=3*i[0]+i[1]-4&&(d.maTrix=u/i[1],u-=null!==(h=c[e-(i[1]-1)].trix)&&void 0!==h?h:0)}c.push(d)})),c}},Ut,{name:"VR",shortName:"VR",calcParams:[26,6],figures:[{key:"vr",title:"VR: ",type:"line"},{key:"maVr",title:"MAVR: ",type:"line"}],calc:function(t,e){var i=e.calcParams,r=0,n=0,o=0,a=0,s=[];return t.forEach((function(e,l){var u,c,h,d,p,g={},v=e.close,f=(null!==(u=t[l-1])&&void 0!==u?u:e).close,y=null!==(c=e.volume)&&void 0!==c?c:0;if(v>f?r+=y:v<f?n+=y:o+=y,l>=i[0]-1){var m=o/2;g.vr=n+m===0?0:(r+m)/(n+m)*100,a+=g.vr,l>=i[0]+i[1]-2&&(g.maVr=a/i[1],a-=null!==(h=s[l-(i[1]-1)].vr)&&void 0!==h?h:0);var _=t[l-(i[0]-1)],x=null!==(d=t[l-i[0]])&&void 0!==d?d:_,b=_.close,w=null!==(p=_.volume)&&void 0!==p?p:0;b>x.close?r-=w:b<x.close?n-=w:o-=w}s.push(g)})),s}},Gt];function qt(t){var e;return null!==(e=Zt[t])&&void 0!==e?e:null}jt.forEach((function(t){Zt[t.name]=kt.extend(t)}));var Kt=function(){function t(){this._children=[],this._callbacks=new Map}return t.prototype.registerEvent=function(t,e){return this._callbacks.set(t,e),this},t.prototype.onEvent=function(t,e){var i=this._callbacks.get(t);return!(!f(i)||!this.checkEventOn(e))&&i(e)},t.prototype.dispatchEventToChildren=function(t,e){var i=this._children.length-1;if(i>-1)for(var r=i;r>-1;r--)if(this._children[r].dispatchEvent(t,e))return!0;return!1},t.prototype.dispatchEvent=function(t,e){return!!this.dispatchEventToChildren(t,e)||this.onEvent(t,e)},t.prototype.addChild=function(t){return this._children.push(t),this},t.prototype.clear=function(){this._children=[]},t}(),Qt=function(t){function e(e){var i=t.call(this)||this;return i.attrs=e.attrs,i.styles=e.styles,i}return i(e,t),e.prototype.checkEventOn=function(t){return this.checkEventOnImp(t,this.attrs,this.styles)},e.prototype.setAttrs=function(t){return this.attrs=t,this},e.prototype.setStyles=function(t){return this.styles=t,this},e.prototype.draw=function(t){this.drawImp(t,this.attrs,this.styles)},e.extend=function(t){var r=function(e){function r(){return null!==e&&e.apply(this,arguments)||this}return i(r,e),r.prototype.checkEventOnImp=function(e,i,r){return t.checkEventOn(e,i,r)},r.prototype.drawImp=function(e,i,r){t.draw(e,i,r)},r}(e);return r},e}(Kt);function $t(t,e){var i,r,n=[];n=n.concat(e);try{for(var o=s(n),a=o.next();!a.done;a=o.next()){var l=a.value.coordinates;if(l.length>1)for(var u=1;u<l.length;u++){var c=l[u-1],h=l[u];if(c.x===h.x){if(Math.abs(c.y-t.y)+Math.abs(h.y-t.y)-Math.abs(c.y-h.y)<4&&Math.abs(t.x-c.x)<2)return!0}else{var d=ee(c,h),p=Jt(d,t),g=Math.abs(p-t.y);if(Math.abs(c.x-t.x)+Math.abs(h.x-t.x)-Math.abs(c.x-h.x)<4&&g*g/(d[0]*d[0]+1)<4)return!0}}}}catch(t){i={error:t}}finally{try{a&&!a.done&&(r=o.return)&&r.call(o)}finally{if(i)throw i.error}}return!1}function Jt(t,e){return null!==t?e.x*t[0]+t[1]:e.y}function te(t,e,i){return Jt(ee(t,e),i)}function ee(t,e){var i=t.x-e.x;if(0!==i){var r=(t.y-e.y)/i;return[r,t.y-r*t.x]}return null}function ie(t,e,i){var r=e.length,n=v(i)?i>0&&i<1?i:0:i?.5:0;if(n>0&&r>2){for(var o=e[0].x,a=e[0].y,s=1;s<r-1;s++){var l=e[s-1],u=e[s],c=e[s+1],h=u.x-l.x,d=u.y-l.y,p=c.x-u.x,g=c.y-u.y,f=c.x-l.x,y=c.y-l.y,m=Math.sqrt(h*h+d*d),_=Math.sqrt(p*p+g*g),x=_/(_+m),b=u.x+f*n*x,w=u.y+y*n*x;b=Math.min(b,Math.max(c.x,u.x)),w=Math.min(w,Math.max(c.y,u.y)),b=Math.max(b,Math.min(c.x,u.x)),w=Math.max(w,Math.min(c.y,u.y)),f=b-u.x,y=w-u.y;var C=u.x-f*m/_,E=u.y-y*m/_;C=Math.min(C,Math.max(l.x,u.x)),E=Math.min(E,Math.max(l.y,u.y)),C=Math.max(C,Math.min(l.x,u.x)),E=Math.max(E,Math.min(l.y,u.y)),f=u.x-C,y=u.y-E,b=u.x+f*_/m,w=u.y+y*_/m,t.bezierCurveTo(o,a,C,E,u.x,u.y),o=b,a=w}var I=e[r-1];t.bezierCurveTo(o,a,I.x,I.y,I.x,I.y)}else for(s=1;s<r;s++)t.lineTo(e[s].x,e[s].y)}var re={name:"line",checkEventOn:$t,draw:function(t,e,i){!function(t,e,i){var r=[];r=r.concat(e);var n=i.style,o=void 0===n?"solid":n,a=i.smooth,s=void 0!==a&&a,l=i.size,u=void 0===l?1:l,c=i.color,h=void 0===c?"currentColor":c,d=i.dashedValue,p=void 0===d?[2,2]:d,g=i.lineCap,f=i.lineJoin,y=v(s)?s>0:s;t.lineWidth=u,t.strokeStyle=h,m(g)?t.lineCap=g:t.lineCap=y?"round":"butt",m(f)?t.lineJoin=f:t.lineJoin=y?"round":"miter","dashed"===o?t.setLineDash(p):t.setLineDash([]);var _=u%2==1?.5:0;r.forEach((function(e){var i=e.coordinates;i.length>1&&(2!==i.length||i[0].x!==i[1].x&&i[0].y!==i[1].y?(t.save(),u%2==1&&t.translate(.5,.5),t.beginPath(),t.moveTo(i[0].x,i[0].y),ie(t,i,s),t.stroke(),t.closePath(),t.restore()):(t.beginPath(),i[0].x===i[1].x?(t.moveTo(i[0].x+_,i[0].y),t.lineTo(i[1].x+_,i[1].y)):(t.moveTo(i[0].x,i[0].y+_),t.lineTo(i[1].x,i[1].y+_)),t.stroke(),t.closePath()))}))}(t,e,i)}};function ne(t,e){var i,r,n,o,a,l,u=[];u=u.concat(e);try{for(var c=s(u),h=c.next();!h.done;h=c.next()){var d=h.value;if(Math.abs((o=d,a=void 0,l=void 0,a=(n=t).x-o.x,l=n.y-o.y,Math.sqrt(a*a+l*l)-d.r))<2){var p=d.r,g=d.startAngle,v=d.endAngle,f=p*Math.cos(g)+d.x,y=p*Math.sin(g)+d.y,m=p*Math.cos(v)+d.x,_=p*Math.sin(v)+d.y;if(t.x<=Math.max(f,m)+2&&t.x>=Math.min(f,m)-2&&t.y<=Math.max(y,_)+2&&t.y>=Math.min(y,_)-2)return!0}}}catch(t){i={error:t}}finally{try{h&&!h.done&&(r=c.return)&&r.call(c)}finally{if(i)throw i.error}}return!1}var oe={name:"arc",checkEventOn:ne,draw:function(t,e,i){!function(t,e,i){var r=[];r=r.concat(e);var n=i.style,o=void 0===n?"solid":n,a=i.size,s=void 0===a?1:a,l=i.color,u=void 0===l?"currentColor":l,c=i.dashedValue,h=void 0===c?[2,2]:c;t.lineWidth=s,t.strokeStyle=u,"dashed"===o?t.setLineDash(h):t.setLineDash([]),r.forEach((function(e){var i=e.x,r=e.y,n=e.r,o=e.startAngle,a=e.endAngle;t.beginPath(),t.arc(i,r,n,o,a),t.stroke(),t.closePath()}))}(t,e,i)}};function ae(t){return"transparent"===t||"none"===t||/^[rR][gG][Bb][Aa]\(([\s]*(2[0-4][0-9]|25[0-5]|[01]?[0-9][0-9]?)[\s]*,){3}[\s]*0[\s]*\)$/.test(t)||/^[hH][Ss][Ll][Aa]\(([\s]*(360|3[0-5][0-9]|[012]?[0-9][0-9]?)[\s]*,)([\s]*((100|[0-9][0-9]?)%|0)[\s]*,){2}([\s]*0[\s]*)\)$/.test(t)}function se(t,e){var i=t.replace(/^#/,""),r=parseInt(i,16),n=r>>8&255,o=255&r;return"rgba(".concat(r>>16&255,", ").concat(n,", ").concat(o,", ").concat(null!=e?e:1,")")}function le(t,e){var i,r,n=[];n=n.concat(e);try{for(var o=s(n),a=o.next();!a.done;a=o.next()){var l=a.value,u=l.x,c=l.y,h=l.r,d=t.x-u,p=t.y-c;if(!(d*d+p*p>h*h))return!0}}catch(t){i={error:t}}finally{try{a&&!a.done&&(r=o.return)&&r.call(o)}finally{if(i)throw i.error}}return!1}var ue={name:"circle",checkEventOn:le,draw:function(t,e,i){!function(t,e,i){var r=[];r=r.concat(e);var n=i.style,o=void 0===n?"fill":n,a=i.color,s=void 0===a?"currentColor":a,l=i.borderSize,u=void 0===l?1:l,c=i.borderColor,h=void 0===c?"currentColor":c,d=i.borderStyle,p=void 0===d?"solid":d,g=i.borderDashedValue,v=void 0===g?[2,2]:g,f=!("fill"!==o&&"stroke_fill"!==i.style||m(s)&&ae(s));f&&(t.fillStyle=s,r.forEach((function(e){var i=e.x,r=e.y,n=e.r;t.beginPath(),t.arc(i,r,n,0,2*Math.PI),t.closePath(),t.fill()}))),("stroke"===o||"stroke_fill"===i.style)&&u>0&&!ae(h)&&(t.strokeStyle=h,t.lineWidth=u,"dashed"===p?t.setLineDash(v):t.setLineDash([]),r.forEach((function(e){var i=e.x,r=e.y,n=e.r;(!f||n>u)&&(t.beginPath(),t.arc(i,r,n,0,2*Math.PI),t.closePath(),t.stroke())})))}(t,e,i)}};function ce(t,e){var i,r,n=[];n=n.concat(e);try{for(var o=s(n),a=o.next();!a.done;a=o.next()){var l=a.value,u=l.x,c=l.width;c<4&&(u-=2,c=4);var h=l.y,d=l.height;if(d<4&&(h-=2,d=4),t.x>=u&&t.x<=u+c&&t.y>=h&&t.y<=h+d)return!0}}catch(t){i={error:t}}finally{try{a&&!a.done&&(r=o.return)&&r.call(o)}finally{if(i)throw i.error}}return!1}function he(t,e,i){var r,n=[];n=n.concat(e);var o=i.style,a=void 0===o?"fill":o,s=i.color,l=void 0===s?"transparent":s,u=i.borderSize,c=void 0===u?1:u,h=i.borderColor,d=void 0===h?"transparent":h,p=i.borderStyle,g=void 0===p?"solid":p,v=i.borderRadius,f=void 0===v?0:v,y=i.borderDashedValue,_=void 0===y?[2,2]:y,x=null!==(r=t.roundRect)&&void 0!==r?r:t.rect,b=!("fill"!==a&&"stroke_fill"!==i.style||m(l)&&ae(l));if(b&&(t.fillStyle=l,n.forEach((function(e){var i=e.x,r=e.y,n=e.width,o=e.height;t.beginPath(),x.call(t,i,r,n,o,f),t.closePath(),t.fill()}))),("stroke"===a||"stroke_fill"===i.style)&&c>0&&!ae(d)){t.strokeStyle=d,t.fillStyle=d,t.lineWidth=c,"dashed"===g?t.setLineDash(_):t.setLineDash([]);var w=c%2==1?.5:0,C=Math.round(2*w);n.forEach((function(e){var i=e.x,r=e.y,n=e.width,o=e.height;n>2*c&&o>2*c?(t.beginPath(),x.call(t,i+w,r+w,n-C,o-C,f),t.closePath(),t.stroke()):b||t.fillRect(i,r,n,o)}))}}var de={name:"rect",checkEventOn:ce,draw:function(t,e,i){he(t,e,i)}},pe={A:7,C:6,H:1,L:2,M:2,Q:4,S:4,T:2,V:1,Z:0},ge=[],ve=new Map,fe=/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;function ye(t,e,i){return t+(i?e:0)}function me(t,e,i,r,n,o,a,s,l){var u=Math.abs(i),c=Math.abs(r);if(t===s&&e===l)return[];if(0===u||0===c)return[];var h=n%360*Math.PI/180,d=Math.cos(h),p=Math.sin(h),g=(t-s)/2,v=(e-l)/2,f=d*g+p*v,y=-p*g+d*v,m=Math.pow(f,2)/Math.pow(u,2)+Math.pow(y,2)/Math.pow(c,2);if(m>1){var _=Math.sqrt(m);u*=_,c*=_}var x=Math.pow(u,2),b=Math.pow(c,2),w=Math.pow(f,2),C=x*Math.pow(y,2)+b*w,E=Math.max(0,x*b-C),I=0===C?0:(o===a?-1:1)*Math.sqrt(E/C),T=I*(u*y/c),S=I*(-c*f/u),A=d*T-p*S+(t+s)/2,M=p*T+d*S+(e+l)/2,P=Math.atan2((y-S)/c,(f-T)/u),D=Math.atan2((-y-S)/c,(-f-T)/u)-P;D<0&&1===a?D+=2*Math.PI:D>0&&0===a&&(D-=2*Math.PI);for(var k=Math.ceil(Math.abs(D)/(Math.PI/2)),B=D/k,F=[],R=0;R<k;R++){var L=P+R*B,O=L+B,Y=4/3*Math.tan((O-L)/4),W=Math.cos(L),z=Math.sin(L),V=Math.cos(O),N=Math.sin(O),H=A+u*W*d-c*z*p,X=M+u*W*p+c*z*d,U=A+u*V*d-c*N*p,G=M+u*V*p+c*N*d,Z=-u*z*d-c*W*p,j=-u*z*p+c*W*d,q=-u*N*d-c*V*p,K=-u*N*p+c*V*d;F.push({type:"C",cp1X:H+Y*Z,cp1Y:X+Y*j,cp2X:U-Y*q,cp2Y:G-Y*K,x:U,y:G})}return F}function _e(t){var e=function(t){var e=[],i=0;fe.lastIndex=0;for(var r=fe.exec(t);null!==r;){if(!/^[\s,]*$/.test(t.slice(i,r.index)))return null;var n=r[0];if(/^[a-zA-Z]$/.test(n))e.push(n);else{var o=Number(n);if(!isFinite(o))return null;e.push(o)}i=fe.lastIndex,r=fe.exec(t)}return/^[\s,]*$/.test(t.slice(i))?e:null}(t);if(null===e)return ge;for(var i=[],r=0,n="",o=0,a=0,s=0,c=0,h=0,d=0,p=0,g=0,v="",f=!1;r<e.length;){if("string"==typeof e[r]){var y=(n=e[r++]).toUpperCase();if(void 0===pe[y])return ge;if("Z"===y){i.push({type:"Z"}),o=s,a=c,v="Z",n="";continue}f="M"===y}else if(""===n)return ge;var m=n.toUpperCase(),_=pe[m];if(r+_>e.length)return ge;for(var x=[],b=0;b<_;b++){var w=e[r+b];if("number"!=typeof w)return ge;x.push(w)}r+=_;var C=n===n.toLowerCase();switch(m){case"M":var E=ye(x[0],o,C),I=ye(x[1],a,C);f?(i.push({type:"M",x:E,y:I}),s=E,c=I,f=!1):i.push({type:"L",x:E,y:I}),o=E,a=I;break;case"L":o=ye(x[0],o,C),a=ye(x[1],a,C),i.push({type:"L",x:o,y:a});break;case"H":o=ye(x[0],o,C),i.push({type:"L",x:o,y:a});break;case"V":a=ye(x[0],a,C),i.push({type:"L",x:o,y:a});break;case"C":var T=ye(x[0],o,C),S=ye(x[1],a,C),A=ye(x[2],o,C),M=ye(x[3],a,C);E=ye(x[4],o,C),I=ye(x[5],a,C);i.push({type:"C",cp1X:T,cp1Y:S,cp2X:A,cp2Y:M,x:E,y:I}),h=A,d=M,o=E,a=I;break;case"S":T="C"===v||"S"===v?2*o-h:o,S="C"===v||"S"===v?2*a-d:a,A=ye(x[0],o,C),M=ye(x[1],a,C),E=ye(x[2],o,C),I=ye(x[3],a,C);i.push({type:"C",cp1X:T,cp1Y:S,cp2X:A,cp2Y:M,x:E,y:I}),h=A,d=M,o=E,a=I;break;case"Q":var P=ye(x[0],o,C),D=ye(x[1],a,C);E=ye(x[2],o,C),I=ye(x[3],a,C);i.push({type:"Q",cpX:P,cpY:D,x:E,y:I}),p=P,g=D,o=E,a=I;break;case"T":P="Q"===v||"T"===v?2*o-p:o,D="Q"===v||"T"===v?2*a-g:a,E=ye(x[0],o,C),I=ye(x[1],a,C);i.push({type:"Q",cpX:P,cpY:D,x:E,y:I}),p=P,g=D,o=E,a=I;break;case"A":if(0!==x[3]&&1!==x[3]||0!==x[4]&&1!==x[4])return ge;E=ye(x[5],o,C),I=ye(x[6],a,C);0===x[0]||0===x[1]?i.push({type:"L",x:E,y:I}):i.push.apply(i,u([],l(me(o,a,x[0],x[1],x[2],x[3],x[4],E,I)),!1)),o=E,a=I;break;default:return ge}v=m}return i}function xe(t,e,i){var r=Array.isArray(e)?e:[e],n=i.style,o=void 0===n?"stroke":n,a=i.lineWidth,s=void 0===a?1:a,l=i.color,u=void 0===l?"currentColor":l;t.lineWidth=s,t.setLineDash([]),"fill"===o?t.fillStyle=u:t.strokeStyle=u,r.forEach((function(e){var i=e.x,r=e.y,n=function(t){var e=ve.get(t);if(void 0!==e)return e;var i=_e(t);if(ve.size>=256){var r=ve.keys().next().value;void 0!==r&&ve.delete(r)}return ve.set(t,i),i}(e.path);n.length>0&&(!function(t,e,i,r){t.beginPath(),e.forEach((function(e){switch(e.type){case"M":t.moveTo(e.x+i,e.y+r);break;case"L":t.lineTo(e.x+i,e.y+r);break;case"C":t.bezierCurveTo(e.cp1X+i,e.cp1Y+r,e.cp2X+i,e.cp2Y+r,e.x+i,e.y+r);break;case"Q":t.quadraticCurveTo(e.cpX+i,e.cpY+r,e.x+i,e.y+r);break;case"Z":t.closePath()}}))}(t,n,i,r),"fill"===o?t.fill():t.stroke())}))}var be={name:"path",checkEventOn:ce,draw:function(t,e,i){xe(t,e,i)}};function we(t,e){var i,r,n=[];n=n.concat(e);try{for(var o=s(n),a=o.next();!a.done;a=o.next()){for(var l=a.value,u=!1,c=l.coordinates,h=0,d=c.length-1;h<c.length;d=h++)c[h].y>t.y!=c[d].y>t.y&&t.x<(c[d].x-c[h].x)*(t.y-c[h].y)/(c[d].y-c[h].y)+c[h].x&&(u=!u);if(u)return!0}}catch(t){i={error:t}}finally{try{a&&!a.done&&(r=o.return)&&r.call(o)}finally{if(i)throw i.error}}return!1}var Ce={name:"polygon",checkEventOn:we,draw:function(t,e,i){!function(t,e,i){var r=[];r=r.concat(e);var n=i.style,o=void 0===n?"fill":n,a=i.color,s=void 0===a?"currentColor":a,l=i.borderSize,u=void 0===l?1:l,c=i.borderColor,h=void 0===c?"currentColor":c,d=i.borderStyle,p=void 0===d?"solid":d,g=i.borderDashedValue,v=void 0===g?[2,2]:g;"fill"!==o&&"stroke_fill"!==i.style||m(s)&&ae(s)||(t.fillStyle=s,r.forEach((function(e){var i=e.coordinates;t.beginPath(),t.moveTo(i[0].x,i[0].y);for(var r=1;r<i.length;r++)t.lineTo(i[r].x,i[r].y);t.closePath(),t.fill()}))),("stroke"===o||"stroke_fill"===i.style)&&u>0&&!ae(h)&&(t.strokeStyle=h,t.lineWidth=u,"dashed"===p?t.setLineDash(v):t.setLineDash([]),r.forEach((function(e){var i=e.coordinates;t.beginPath(),t.moveTo(i[0].x,i[0].y);for(var r=1;r<i.length;r++)t.lineTo(i[r].x,i[r].y);t.closePath(),t.stroke()})))}(t,e,i)}};function Ee(t,e){var i=e.size,r=void 0===i?12:i,n=e.paddingLeft,o=void 0===n?0:n,a=e.paddingTop,s=void 0===a?0:a,l=e.paddingRight,u=void 0===l?0:l,c=e.paddingBottom,h=void 0===c?0:c,d=e.weight,p=void 0===d?"normal":d,g=e.family,v=t.x,f=t.y,y=t.text,m=t.align,_=void 0===m?"left":m,x=t.baseline,b=void 0===x?"top":x,w=t.width,C=t.height,E=null!=w?w:o+S(y,r,p,g)+u,I=null!=C?C:s+r+h,T=0;switch(_){case"left":case"start":T=v;break;case"right":case"end":T=v-E;break;default:T=v-E/2}var A=0;switch(b){case"top":case"hanging":A=f;break;case"bottom":case"ideographic":case"alphabetic":A=f-I;break;default:A=f-I/2}return{x:T,y:A,width:E,height:I}}function Ie(t,e,i){var r,n,o=[];o=o.concat(e);try{for(var a=s(o),l=a.next();!l.done;l=a.next()){var u=Ee(l.value,i),c=u.x,h=u.y,d=u.width,p=u.height;if(t.x>=c&&t.x<=c+d&&t.y>=h&&t.y<=h+p)return!0}}catch(t){r={error:t}}finally{try{l&&!l.done&&(n=a.return)&&n.call(a)}finally{if(r)throw r.error}}return!1}var Te={name:"text",checkEventOn:Ie,draw:function(t,e,i){!function(t,e,i){var n=[];n=n.concat(e);var o=i.color,a=void 0===o?"currentColor":o,s=i.size,l=void 0===s?12:s,u=i.family,c=i.weight,h=i.paddingLeft,d=void 0===h?0:h,p=i.paddingTop,g=void 0===p?0:p,v=i.paddingRight,f=void 0===v?0:v,y=n.map((function(t){return Ee(t,i)}));he(t,y,r(r({},i),{color:i.backgroundColor})),t.textAlign="left",t.textBaseline="top",t.font=T(l,c,u),t.fillStyle=a,n.forEach((function(e,i){var r=y[i];t.fillText(e.text,r.x+d,r.y+g,r.width-d-f)}))}(t,e,i)}},Se={};[ue,re,Ce,de,Te,oe,be].forEach((function(t){Se[t.name]=Qt.extend(t)}));var Ae=function(t){function e(e){var i=t.call(this)||this;return i._widget=e,i}return i(e,t),e.prototype.getWidget=function(){return this._widget},e.prototype.createFigure=function(t,e){var i=function(t){var e;return null!==(e=Se[t])&&void 0!==e?e:null}(t.name);if(null!==i){var r=new i(t);if(f(e)){for(var n in e)e.hasOwnProperty(n)&&r.registerEvent(n,e[n]);this.addChild(r)}return r}return null},e.prototype.draw=function(t){this.clear(),this.drawImp(t)},e.prototype.checkEventOn=function(t){return!0},e}(Kt),Me=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.eachChildren=function(t){for(var e=this.getWidget().getPane().getChart().getChartStore(),i=e.getVisibleRangeDataList(),r=e.getBarSpace(),n=i.length,o=0;o<n;)t(i[o],r,o),++o},e}(Ae),Pe=function(t){function e(){var e=t.apply(this,u([],l(arguments),!1))||this;return e._ripplePoint=e.createFigure({name:"circle",attrs:{x:0,y:0,r:0},styles:{style:"fill"}}),e._animationFrameTime=0,e._animation=new w({iterationCount:1/0}).doFrame((function(t){e._animationFrameTime=t;var i=e.getWidget().getPane();i.getChart().updatePane(0,i.getId())})),e}return i(e,t),e.prototype.drawImp=function(t){var e,i,r,n=this.getWidget(),o=n.getPane(),a=o.getChart(),s=a.getDataList().length-1,l=n.getBounding(),u=o.getYAxisComponentById(),c=a.getStyles().candle.area,h=[],p=Number.MAX_SAFE_INTEGER,g=Number.MIN_SAFE_INTEGER,y=null;if(this.eachChildren((function(t){var e=t.x,i=t.data.current,r=null==i?void 0:i[c.value];if(v(r)){var n=u.convertToPixel(r);g===Number.MIN_SAFE_INTEGER&&(g=e),h.push({x:e,y:n}),p=Math.min(p,n),t.dataIndex===s&&(y={x:e,y:n})}})),h.length>0){null===(e=this.createFigure({name:"line",attrs:{coordinates:h},styles:{color:c.lineColor,size:c.lineSize,smooth:c.smooth}}))||void 0===e||e.draw(t);var m=c.backgroundColor,_="";if(d(m)){var x=t.createLinearGradient(0,l.height,0,p);try{m.forEach((function(t){var e=t.offset,i=t.color;x.addColorStop(e,i)}))}catch(t){}_=x}else _=m;t.fillStyle=_,t.beginPath(),t.moveTo(g,l.height),t.lineTo(h[0].x,h[0].y),ie(t,h,c.smooth),t.lineTo(h[h.length-1].x,l.height),t.closePath(),t.fill()}var b=c.point;if(b.show&&f(y)){null===(i=this.createFigure({name:"circle",attrs:{x:y.x,y:y.y,r:b.radius},styles:{style:"fill",color:b.color}}))||void 0===i||i.draw(t);var w=b.rippleRadius;if(b.animation&&v(b.animationDuration)&&b.animationDuration>0){var C=Math.min(this._animationFrameTime/b.animationDuration,1);w=b.radius+C*(b.rippleRadius-b.radius),this._animation.setDuration(b.animationDuration).start()}else this.stopAnimation();null===(r=this._ripplePoint)||void 0===r||r.setAttrs({x:y.x,y:y.y,r:w}).setStyles({style:"fill",color:b.rippleColor}).draw(t)}else this.stopAnimation()},e.prototype.stopAnimation=function(){this._animationFrameTime=0,this._animation.cancel()},e}(Me),De=function(t){function e(){var e=t.apply(this,u([],l(arguments),!1))||this;return e._boundCandleBarClickEvent=function(t){return function(){return e.getWidget().getPane().getChart().getChartStore().executeAction("onCandleBarClick",t),!1}},e}return i(e,t),e.prototype.drawImp=function(t){var e=this,i=this.getWidget().getPane(),r=i.getId()===j,n=i.getChart().getChartStore(),o=this.getCandleBarOptions();if(null!==o){var a=o.type,s=o.styles,l=0,u=0;if("ohlc"===o.type){var c=n.getBarSpace().gapBar;(l=Math.min(Math.max(Math.round(.2*c),1),8))>2&&l%2==1&&l--,u=Math.floor(l/2)}var h=i.getYAxisComponentById(o.yAxisId);this.eachChildren((function(i,n){var o,c=i.x,d=i.data,p=d.current,g=d.prev;if(f(p)){var v=p.open,y=p.high,m=p.low,_=p.close,x="current_open"===s.compareRule?v:null!==(o=null==g?void 0:g.close)&&void 0!==o?o:_,b=[];_>x?(b[0]=s.upColor,b[1]=s.upBorderColor,b[2]=s.upWickColor):_<x?(b[0]=s.downColor,b[1]=s.downBorderColor,b[2]=s.downWickColor):(b[0]=s.noChangeColor,b[1]=s.noChangeBorderColor,b[2]=s.noChangeWickColor);var w=h.convertToPixel(v),C=h.convertToPixel(_),E=[w,C,h.convertToPixel(y),h.convertToPixel(m)];E.sort((function(t,e){return t-e}));var I=n.gapBar%2==0?1:0,T=[];switch(a){case"candle_solid":T=e._createSolidBar(c,E,n,b,I);break;case"candle_stroke":T=e._createStrokeBar(c,E,n,b,I);break;case"candle_up_stroke":T=_>v?e._createStrokeBar(c,E,n,b,I):e._createSolidBar(c,E,n,b,I);break;case"candle_down_stroke":T=v>_?e._createStrokeBar(c,E,n,b,I):e._createSolidBar(c,E,n,b,I);break;case"ohlc":T=[{name:"rect",attrs:[{x:c-u,y:E[0],width:l,height:E[3]-E[0]},{x:c-n.halfGapBar,y:w+l>E[3]?E[3]-l:w,width:n.halfGapBar-u,height:l},{x:c+u,y:C+l>E[3]?E[3]-l:C,width:n.halfGapBar-u,height:l}],styles:{color:b[0]}}]}T.forEach((function(n){var o,a=null;r&&(a={mouseClickEvent:e._boundCandleBarClickEvent(i)}),null===(o=e.createFigure(n,null!=a?a:void 0))||void 0===o||o.draw(t)}))}}))}},e.prototype.getCandleBarOptions=function(){var t=this.getWidget().getPane(),e=t.getDefaultYAxisId();if(!f(e))return null;var i=t.getChart().getStyles().candle;return{yAxisId:e,type:i.type,styles:i.bar}},e.prototype._createSolidBar=function(t,e,i,r,n){return[{name:"rect",attrs:{x:t,y:e[0],width:1,height:e[3]-e[0]},styles:{color:r[2]}},{name:"rect",attrs:{x:t-i.halfGapBar,y:e[1],width:i.gapBar+n,height:Math.max(1,e[2]-e[1])},styles:{style:"stroke_fill",color:r[0],borderColor:r[1]}}]},e.prototype._createStrokeBar=function(t,e,i,r,n){return[{name:"rect",attrs:[{x:t,y:e[0],width:1,height:e[1]-e[0]},{x:t,y:e[2],width:1,height:e[3]-e[2]}],styles:{color:r[2]}},{name:"rect",attrs:{x:t-i.halfGapBar,y:e[1],width:i.gapBar+n,height:Math.max(1,e[2]-e[1])},styles:{style:"stroke",borderColor:r[1]}}]},e}(Me),ke=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.drawImp=function(t){var e,i,r=this.getWidget().getPane(),n=r.getChart().getChartStore(),o=n.getStyles().candle.priceMark,a=o.high,s=o.low;if(o.show&&(a.show||s.show)){var l=n.getVisibleRangeHighLowPrice(),u=null!==(i=null===(e=n.getSymbol())||void 0===e?void 0:e.pricePrecision)&&void 0!==i?i:O,c=r.getYAxisComponentById(),h=l[0],d=h.price,p=h.x,g=l[1],v=g.price,f=g.x,y=c.convertToPixel(d),m=c.convertToPixel(v),_=n.getDecimalFold(),x=n.getThousandsSeparator();a.show&&d!==Number.MIN_SAFE_INTEGER&&this._drawMark(t,_.format(x.format(H(d,u))),{x:p,y:y},y<m?[-2,-5]:[2,5],a),s.show&&v!==Number.MAX_SAFE_INTEGER&&this._drawMark(t,_.format(x.format(H(v,u))),{x:f,y:m},y<m?[2,5]:[-2,-5],s)}},e.prototype._drawMark=function(t,e,i,r,n){var o,a,s,l=i.x,u=i.y+r[0];null===(o=this.createFigure({name:"line",attrs:{coordinates:[{x:l-2,y:u+r[0]},{x:l,y:u},{x:l+2,y:u+r[0]}]},styles:{color:n.color}}))||void 0===o||o.draw(t);var c=0,h=0,d="left";l>this.getWidget().getBounding().width/2?(h=(c=l-5)-n.textOffset,d="right"):(d="left",h=(c=l+5)+n.textOffset);var p=u+r[1];null===(a=this.createFigure({name:"line",attrs:{coordinates:[{x:l,y:u},{x:l,y:p},{x:c,y:p}]},styles:{color:n.color}}))||void 0===a||a.draw(t),null===(s=this.createFigure({name:"text",attrs:{x:h,y:p,text:e,align:d,baseline:"middle"},styles:{color:n.color,size:n.textSize,family:n.textFamily,weight:n.textWeight}}))||void 0===s||s.draw(t)},e}(Ae),Be=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.drawImp=function(t){var e,i,r,n=this.getWidget(),o=n.getPane(),a=n.getBounding(),s=o.getChart().getChartStore(),l=s.getStyles().candle.priceMark,u=l.last,c=u.line;if(l.show&&u.show&&c.show){var h=o.getYAxisComponentById(),d=s.getDataList(),p=d[d.length-1];if(f(p)){var g=p.close,v=p.open,y="current_open"===u.compareRule?v:null!==(i=null===(e=d[d.length-2])||void 0===e?void 0:e.close)&&void 0!==i?i:g,m=h.convertToNicePixel(g),_="";_=g>y?u.upColor:g<y?u.downColor:u.noChangeColor,null===(r=this.createFigure({name:"line",attrs:{coordinates:[{x:0,y:m},{x:a.width,y:m}]},styles:{style:c.style,color:_,size:c.size,dashedValue:c.dashedValue}}))||void 0===r||r.draw(t)}}},e}(Ae),Fe={second:"HH:mm:ss",minute:"HH:mm",hour:"MM-DD HH:mm",day:"YYYY-MM-DD",week:"YYYY-MM-DD",month:"YYYY-MM",year:"YYYY"},Re={second:"HH:mm:ss",minute:"YYYY-MM-DD HH:mm",hour:"YYYY-MM-DD HH:mm",day:"YYYY-MM-DD",week:"YYYY-MM-DD",month:"YYYY-MM",year:"YYYY"},Le={"zh-CN":{time:"时间：",open:"开：",high:"高：",low:"低：",close:"收：",volume:"成交量：",turnover:"成交额：",change:"涨幅：",second:"秒",minute:"",hour:"小时",day:"天",week:"周",month:"月",year:"年"},"en-US":{time:"Time: ",open:"Open: ",high:"High: ",low:"Low: ",close:"Close: ",volume:"Volume: ",turnover:"Turnover: ",change:"Change: ",second:"S",minute:"",hour:"H",day:"D",week:"W",month:"M",year:"Y"}};function Oe(t,e){var i;return null!==(i=Le[e][t])&&void 0!==i?i:t}var Ye=function(t){function e(e){var i=t.call(this,e)||this;return i._activeFeatureInfo=null,i._featureClickEvent=function(t,e){return function(){return i.getWidget().getPane().getChart().getChartStore().executeAction(t,e),!0}},i._featureMouseMoveEvent=function(t){return function(){return i._activeFeatureInfo=t,!0}},i.registerEvent("mouseMoveEvent",(function(t){return i._activeFeatureInfo=null,!1})),i}return i(e,t),e.prototype.drawImp=function(t){var e=this.getWidget(),i=e.getPane().getChart().getChartStore();if(f(i.getCrosshair().kLineData)){var r=e.getBounding(),n=i.getStyles().indicator.tooltip,o=n.offsetLeft,a=n.offsetTop,s=n.offsetRight;this.drawIndicatorTooltip(t,o,a,r.width-s)}},e.prototype.drawIndicatorTooltip=function(t,e,i,r){var n=this,o=this.getWidget().getPane(),a=o.getChart().getChartStore(),s=a.getStyles().indicator.tooltip;if(this.isDrawTooltip(a.getCrosshair(),s)){var l=a.getIndicatorsByPaneId(o.getId()),u=s.title,c=s.legend;l.forEach((function(o){var a=0,s={x:e,y:i},l=n.getIndicatorTooltipData(o),h=l.name,d=l.calcParamsText,p=l.legends,g=l.features,v=h.length>0,f=p.length>0;if(v||f){var y=n.classifyTooltipFeatures(g);if(a=n.drawStandardTooltipFeatures(t,y[0],s,o,e,a,r),v){var m=h;d.length>0&&(m="".concat(m).concat(d));var _=u.color;a=n.drawStandardTooltipLegends(t,[{title:{text:"",color:_},value:{text:m,color:_}}],s,e,a,r,u)}a=n.drawStandardTooltipFeatures(t,y[1],s,o,e,a,r),f&&(a=n.drawStandardTooltipLegends(t,p,s,e,a,r,c)),a=n.drawStandardTooltipFeatures(t,y[2],s,o,e,a,r),i=s.y+a}}))}return i},e.prototype.drawStandardTooltipFeatures=function(t,e,i,r,n,o,a){var s=this;if(e.length>0){var l=0,u=0;e.forEach((function(e){var i=e.marginLeft,r=void 0===i?0:i,n=e.marginTop,o=void 0===n?0:n,a=e.marginRight,s=void 0===a?0:a,c=e.marginBottom,h=void 0===c?0:c,d=e.paddingLeft,p=void 0===d?0:d,g=e.paddingTop,v=void 0===g?0:g,f=e.paddingRight,y=void 0===f?0:f,m=e.paddingBottom,_=void 0===m?0:m,x=e.size,b=void 0===x?0:x,w=e.type,C=e.content,E=0;if("icon_font"===w){var I=C;t.font=T(b,"normal",I.family),E=t.measureText(I.code).width}else E=b;l+=r+p+E+y+s,u=Math.max(u,o+v+b+_+h)})),i.x+l>a?(i.x=n,i.y+=o,o=u):o=Math.max(o,u);var c=this.getWidget().getPane().getId();e.forEach((function(e){var n,o,a,l,u,h=e.marginLeft,d=void 0===h?0:h,p=e.marginTop,g=void 0===p?0:p,v=e.marginRight,y=void 0===v?0:v,m=e.paddingLeft,_=void 0===m?0:m,x=e.paddingTop,b=void 0===x?0:x,w=e.paddingRight,C=void 0===w?0:w,E=e.paddingBottom,I=void 0===E?0:E,T=e.backgroundColor,S=e.activeBackgroundColor,A=e.borderRadius,M=e.size,P=void 0===M?0:M,D=e.color,k=e.activeColor,B=e.type,F=e.content,R=D,L=T;(null===(n=s._activeFeatureInfo)||void 0===n?void 0:n.paneId)===c&&(null===(o=s._activeFeatureInfo.indicator)||void 0===o?void 0:o.id)===(null==r?void 0:r.id)&&s._activeFeatureInfo.feature.id===e.id&&(R=null!=k?k:D,L=null!=S?S:T);var O="onCandleTooltipFeatureClick",Y={paneId:c,feature:e};f(r)&&(O="onIndicatorTooltipFeatureClick",Y.indicator=r);var W={mouseDownEvent:s._featureClickEvent(O,Y),mouseMoveEvent:s._featureMouseMoveEvent(Y)},z=0;if("icon_font"===B){var V=F;null===(a=s.createFigure({name:"text",attrs:{text:V.code,x:i.x+d,y:i.y+g},styles:{paddingLeft:_,paddingTop:b,paddingRight:C,paddingBottom:I,borderRadius:A,size:P,family:V.family,color:R,backgroundColor:L}},W))||void 0===a||a.draw(t),z=t.measureText(V.code).width}else{null===(l=s.createFigure({name:"rect",attrs:{x:i.x+d,y:i.y+g,width:P,height:P},styles:{paddingLeft:_,paddingTop:b,paddingRight:C,paddingBottom:I,color:L}},W))||void 0===l||l.draw(t);var N=F;null===(u=s.createFigure({name:"path",attrs:{path:N.path,x:i.x+d+_,y:i.y+g+b,width:P,height:P},styles:{style:N.style,lineWidth:N.lineWidth,color:R}}))||void 0===u||u.draw(t),z=P}i.x+=d+_+z+C+y}))}return o},e.prototype.drawStandardTooltipLegends=function(t,e,i,r,n,o,a){var s=this;if(e.length>0){var l=a.marginLeft,u=a.marginTop,c=a.marginRight,h=a.marginBottom,d=a.size,p=a.family,g=a.weight;t.font=T(d,g,p),e.forEach((function(e){var a,v,f=e.title,y=e.value,m=t.measureText(f.text).width,_=m+t.measureText(y.text).width,x=u+d+h;i.x+l+_+c>o?(i.x=r,i.y+=n,n=x):n=Math.max(n,x),f.text.length>0&&(null===(a=s.createFigure({name:"text",attrs:{x:i.x+l,y:i.y+u,text:f.text},styles:{color:f.color,size:d,family:p,weight:g}}))||void 0===a||a.draw(t)),null===(v=s.createFigure({name:"text",attrs:{x:i.x+l+m,y:i.y+u,text:y.text},styles:{color:y.color,size:d,family:p,weight:g}}))||void 0===v||v.draw(t),i.x+=l+_+c}))}return n},e.prototype.isDrawTooltip=function(t,e){var i=e.showRule;return"always"===i||"follow_cross"===i&&m(t.paneId)},e.prototype.getIndicatorTooltipData=function(t){var e,i=this.getWidget().getPane().getChart().getChartStore(),r=i.getStyles().indicator,n=r.tooltip,o=n.title,a="",s="";if(o.show&&(o.showName&&(a=t.shortName),o.showParams)){var l=t.calcParams;l.length>0&&(s="(".concat(l.join(","),")"))}var u={name:a,calcParamsText:s,legends:[],features:n.features},c=i.getCrosshair().dataIndex,h=t.result,d=i.getInnerFormatter(),y=i.getDecimalFold(),_=i.getThousandsSeparator(),x=[];if(t.visible){var b=i.getBarSpace(),w=null!==(e=h[c])&&void 0!==e?e:{},C=n.legend.defaultValue;Dt(t,c,b,r,(function(e,i){if(m(e.title)){var r=i.color,n=w[e.key];v(n)&&(n=H(n,t.precision),t.shouldFormatBigNumber&&(n=d.formatBigNumber(n)),n=y.format(_.format(n))),x.push({title:{text:e.title,color:r},value:{text:null!=n?n:C,color:r}})}})),u.legends=x}if(p(t.createTooltipDataSource)){var E=this.getWidget(),I=E.getPane(),T=I.getChart(),S=t.createTooltipDataSource({chart:T,indicator:t,crosshair:i.getCrosshair(),bounding:E.getBounding(),xAxis:I.getChart().getXAxisPane().getXAxisComponent(),yAxis:I.getYAxisComponentById(t.yAxisId)}),A=S.name,M=S.calcParamsText,P=S.legends,D=S.features;if(o.show&&(m(A)&&o.showName&&(u.name=A),m(M)&&o.showParams&&(u.calcParamsText=M)),f(D)&&(u.features=D),f(P)&&t.visible){var k=[],B=r.tooltip.legend.color;P.forEach((function(t){var e={text:"",color:B};g(t.title)?e=t.title:e.text=t.title;var i={text:"",color:B};g(t.value)?i=t.value:i.text=t.value,v(Number(i.text))&&(i.text=y.format(_.format(i.text))),k.push({title:e,value:i})})),u.legends=k}}return u},e.prototype.classifyTooltipFeatures=function(t){var e=[],i=[],r=[];return t.forEach((function(t){switch(t.position){case"left":e.push(t);break;case"middle":i.push(t);break;case"right":r.push(t)}})),[e,i,r]},e}(Ae),We=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.drawImp=function(t){var e=this.getWidget(),i=e.getPane().getChart().getChartStore(),r=i.getCrosshair();if(f(r.kLineData)){var n=e.getBounding(),o=i.getStyles(),a=o.candle,s=o.indicator;if("rect"===a.tooltip.showType&&"rect"===s.tooltip.showType){var l=this.isDrawTooltip(r,a.tooltip),u=this.isDrawTooltip(r,s.tooltip);this._drawRectTooltip(t,l,u,a.tooltip.offsetTop)}else if("standard"===a.tooltip.showType&&"standard"===s.tooltip.showType){var c=a.tooltip,h=c.offsetLeft,d=c.offsetTop,p=c.offsetRight,g=n.width-p,v=this._drawCandleStandardTooltip(t,h,d,g);this.drawIndicatorTooltip(t,h,v,g)}else if("rect"===a.tooltip.showType&&"standard"===s.tooltip.showType){var y=a.tooltip,m=(h=y.offsetLeft,d=y.offsetTop,p=y.offsetRight,g=n.width-p,this.drawIndicatorTooltip(t,h,d,g));l=this.isDrawTooltip(r,a.tooltip);this._drawRectTooltip(t,l,!1,m)}else{var _=a.tooltip,x=(h=_.offsetLeft,d=_.offsetTop,p=_.offsetRight,g=n.width-p,this._drawCandleStandardTooltip(t,h,d,g));u=this.isDrawTooltip(r,s.tooltip);this._drawRectTooltip(t,!1,u,x)}}},e.prototype._drawCandleStandardTooltip=function(t,e,i,n){var o,a=this.getWidget().getPane().getChart().getChartStore(),s=a.getStyles().candle.tooltip,l=s.legend,u=0,c={x:e,y:i},h=a.getCrosshair();if(this.isDrawTooltip(h,s)){var d=s.title;if(d.show){var p=null!==(o=a.getPeriod())&&void 0!==o?o:{},g=p.type,v=void 0===g?"":g,f=p.span,y=void 0===f?"":f,m=Z(d.template,r(r({},a.getSymbol()),{period:"".concat(y).concat(Oe(v,a.getLocale()))})),_=d.color,x=this.drawStandardTooltipLegends(t,[{title:{text:"",color:_},value:{text:m,color:_}}],{x:e,y:i},e,0,n,d);c.y=c.y+x}var b=this._getCandleTooltipLegends(),w=this.classifyTooltipFeatures(s.features);u=this.drawStandardTooltipFeatures(t,w[0],c,null,e,u,n),u=this.drawStandardTooltipFeatures(t,w[1],c,null,e,u,n),b.length>0&&(u=this.drawStandardTooltipLegends(t,b,c,e,u,n,l)),u=this.drawStandardTooltipFeatures(t,w[2],c,null,e,u,n)}return c.y+u},e.prototype._drawRectTooltip=function(t,e,i,r){var n,o,a=this,s=this.getWidget(),l=s.getPane(),u=l.getChart().getChartStore(),c=u.getStyles(),h=c.candle,d=c.indicator,p=h.tooltip,g=d.tooltip;if(e||i){var v=this._getCandleTooltipLegends(),f=p.offsetLeft,y=p.offsetTop,m=p.offsetRight,_=p.offsetBottom,x=p.legend,b=x.marginLeft,w=x.marginRight,C=x.marginTop,E=x.marginBottom,I=x.size,S=x.weight,A=x.family,M=p.rect,P=M.position,D=M.paddingLeft,k=M.paddingRight,B=M.paddingTop,F=M.paddingBottom,R=M.offsetLeft,L=M.offsetRight,O=M.offsetTop,Y=M.offsetBottom,W=M.borderSize,z=M.borderRadius,V=M.borderColor,N=M.color,H=0,X=0,U=0;e&&(t.font=T(I,S,A),v.forEach((function(e){var i=e.title,r=e.value,n="".concat(i.text).concat(r.text),o=t.measureText(n).width+b+w;H=Math.max(H,o)})),U+=(E+C+I)*v.length);var G=g.legend,Z=G.marginLeft,q=G.marginRight,K=G.marginTop,Q=G.marginBottom,$=G.size,J=G.weight,tt=G.family,et=[];if(i){var it=u.getIndicatorsByPaneId(l.getId());t.font=T($,J,tt),it.forEach((function(e){var i=a.getIndicatorTooltipData(e).legends;et.push(i),i.forEach((function(e){var i=e.title,r=e.value,n="".concat(i.text).concat(r.text),o=t.measureText(n).width+Z+q;H=Math.max(H,o),U+=K+Q+$}))}))}if(0!==(X+=H)&&0!==U){var rt=u.getCrosshair(),nt=s.getBounding(),ot=l.getYAxisWidget().getBounding();X+=2*W+D+k,U+=2*W+B+F;var at=nt.width/2,st="pointer"===P&&rt.paneId===j,lt=(null!==(n=rt.realX)&&void 0!==n?n:0)>at,ut=0;if(st){var ct=rt.realX;ut=lt?ct-L-X:ct+R}else{var ht=this.getWidget().getPane().getYAxisComponentById();lt?(ut=R+f,ht.inside&&"left"===ht.position&&(ut+=ot.width)):(ut=nt.width-L-X-m,ht.inside&&"right"===ht.position&&(ut-=ot.width))}var dt=r+O;if(st)(dt=rt.y-U/2)+U>nt.height-Y-_&&(dt=nt.height-Y-U-_),dt<r+O&&(dt=r+O+y);null===(o=this.createFigure({name:"rect",attrs:{x:ut,y:dt,width:X,height:U},styles:{style:"stroke_fill",color:N,borderColor:V,borderSize:W,borderRadius:z}}))||void 0===o||o.draw(t);var pt=ut+W+D+b,gt=dt+W+B;if(e&&v.forEach((function(e){var i,r;gt+=C;var n=e.title;null===(i=a.createFigure({name:"text",attrs:{x:pt,y:gt,text:n.text},styles:{color:n.color,size:I,family:A,weight:S}}))||void 0===i||i.draw(t);var o=e.value;null===(r=a.createFigure({name:"text",attrs:{x:ut+X-W-w-k,y:gt,text:o.text,align:"right"},styles:{color:o.color,size:I,family:A,weight:S}}))||void 0===r||r.draw(t),gt+=I+E})),i){var vt=ut+W+D+Z;et.forEach((function(e){e.forEach((function(e){var i,r;gt+=K;var n=e.title,o=e.value;null===(i=a.createFigure({name:"text",attrs:{x:vt,y:gt,text:n.text},styles:{color:n.color,size:$,family:tt,weight:J}}))||void 0===i||i.draw(t),null===(r=a.createFigure({name:"text",attrs:{x:ut+X-W-q-k,y:gt,text:o.text,align:"right"},styles:{color:o.color,size:$,family:tt,weight:J}}))||void 0===r||r.draw(t),gt+=$+Q}))}))}}}},e.prototype._getCandleTooltipLegends=function(){var t,e,i,n,o,a,s,l,u=this.getWidget().getPane().getChart().getChartStore(),c=u.getStyles().candle,h=u.getDataList(),d=u.getInnerFormatter(),v=u.getDecimalFold(),y=u.getThousandsSeparator(),m=u.getLocale(),_=null!==(t=u.getSymbol())&&void 0!==t?t:{},x=_.pricePrecision,b=void 0===x?O:x,w=_.volumePrecision,C=void 0===w?Y:w,E=u.getPeriod(),I=null!==(e=u.getCrosshair().dataIndex)&&void 0!==e?e:0,T=c.tooltip.legend,S=T.color,A=T.defaultValue,M=T.template,P=null!==(i=h[I-1])&&void 0!==i?i:null,D=h[I],k=null!==(n=null==P?void 0:P.close)&&void 0!==n?n:D.close,B=D.close-k,F=r(r({},D),{time:d.formatDate(D.timestamp,Re[null!==(o=null==E?void 0:E.type)&&void 0!==o?o:"day"],"tooltip"),open:v.format(y.format(H(D.open,b))),high:v.format(y.format(H(D.high,b))),low:v.format(y.format(H(D.low,b))),close:v.format(y.format(H(D.close,b))),volume:v.format(y.format(d.formatBigNumber(H(null!==(a=D.volume)&&void 0!==a?a:A,C)))),turnover:v.format(y.format(H(null!==(s=D.turnover)&&void 0!==s?s:A,b))),change:0===k?A:"".concat(y.format(H(B/k*100)),"%")});return(p(M)?M({prev:P,current:D,next:null!==(l=h[I+1])&&void 0!==l?l:null},c):M).map((function(t){var e=t.title,i=t.value,n={text:"",color:S};g(e)?n=r({},e):n.text=e,n.text=Oe(n.text,m);var o={text:A,color:S};return g(i)?o=r({},i):o.text=i,f(/{change}/.exec(o.text))&&(o.color=0===B?c.priceMark.last.noChangeColor:B>0?c.priceMark.last.upColor:c.priceMark.last.downColor),o.text=Z(o.text,F),{title:n,value:o}}))},e}(Ye),ze=function(t){function e(e){var i=t.call(this,e)||this;return i._activeFeatureInfo=null,i._featureClickEvent=function(t){return function(){return i.getWidget().getPane().getChart().getChartStore().executeAction("onCrosshairFeatureClick",t),!0}},i._featureMouseMoveEvent=function(t){return function(){return i._activeFeatureInfo=t,i.getWidget().setForceCursor("pointer"),!0}},i.registerEvent("mouseMoveEvent",(function(t){return i._activeFeatureInfo=null,i.getWidget().setForceCursor(null),!1})),i}return i(e,t),e.prototype.drawImp=function(t){var e,i,r=this,n=this.getWidget(),o=n.getPane(),a=n.getPane().getChart().getChartStore(),s=a.getCrosshair(),l=this.getWidget(),u=l.getPane().getYAxisComponentById();if(m(s.paneId)&&s.paneId===o.getId()&&u.isInCandle()){var c=a.getStyles().crosshair,h=c.horizontal.features;if(c.show&&c.horizontal.show&&h.length>0){var d="right"===u.position,p=l.getBounding(),g=0,v=c.horizontal.text;if(u.inside&&v.show){var f=u.convertFromPixel(s.y),y=u.getRange(),_=u.displayValueToText(u.realValueToDisplayValue(u.valueToRealValue(f,{range:y}),{range:y}),null!==(i=null===(e=a.getSymbol())||void 0===e?void 0:e.pricePrecision)&&void 0!==i?i:O);_=a.getDecimalFold().format(a.getThousandsSeparator().format(_)),g=v.paddingLeft+S(_,v.size,v.weight,v.family)+v.paddingRight}var x=g;d&&(x=p.width-g);var b=s.y;h.forEach((function(e){var i,n,o,a,l=e.marginLeft,u=void 0===l?0:l,c=e.marginTop,h=void 0===c?0:c,p=e.marginRight,g=void 0===p?0:p,v=e.paddingLeft,f=void 0===v?0:v,y=e.paddingTop,m=void 0===y?0:y,_=e.paddingRight,w=void 0===_?0:_,C=e.paddingBottom,E=void 0===C?0:C,I=e.color,T=e.activeColor,A=e.backgroundColor,M=e.activeBackgroundColor,P=e.borderRadius,D=e.size,k=void 0===D?0:D,B=e.type,F=e.content,R=k;"icon_font"===B&&(R=f+S((W=F).code,k,"normal",W.family)+w);d?x-=R+g:x+=u;var L=I,O=A;(null===(i=r._activeFeatureInfo)||void 0===i?void 0:i.feature.id)===e.id&&(L=null!=T?T:I,O=null!=M?M:A);var Y={mouseDownEvent:r._featureClickEvent({crosshair:s,feature:e}),mouseMoveEvent:r._featureMouseMoveEvent({crosshair:s,feature:e})};if("icon_font"===B){var W=F;null===(n=r.createFigure({name:"text",attrs:{text:W.code,x:x,y:b+h,baseline:"middle"},styles:{paddingLeft:f,paddingTop:m,paddingRight:w,paddingBottom:E,borderRadius:P,size:k,family:W.family,color:L,backgroundColor:O}},Y))||void 0===n||n.draw(t)}else{null===(o=r.createFigure({name:"rect",attrs:{x:x,y:b+h-k/2,width:k,height:k},styles:{paddingLeft:f,paddingTop:m,paddingRight:w,paddingBottom:E,color:O}},Y))||void 0===o||o.draw(t);var z=F;null===(a=r.createFigure({name:"path",attrs:{path:z.path,x:x+f,y:b+h+m-k/2,width:k,height:k},styles:{style:z.style,lineWidth:z.lineWidth,color:L}}))||void 0===a||a.draw(t)}d?x-=u:x+=R+g}))}}},e}(Ae),Ve=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.drawImp=function(t){var e=this.getWidget(),i=e.getPane(),r=e.getBounding(),n=e.getPane().getChart().getChartStore(),o=n.getCrosshair(),a=n.getStyles().crosshair;if(m(o.paneId)&&a.show){if(o.paneId===i.getId()){var s=o.y;this._drawLine(t,[{x:0,y:s},{x:r.width,y:s}],a.horizontal)}var l=o.realX;this._drawLine(t,[{x:l,y:0},{x:l,y:r.height}],a.vertical)}},e.prototype._drawLine=function(t,e,i){var r;if(i.show){var n=i.line;n.show&&(null===(r=this.createFigure({name:"line",attrs:{coordinates:e},styles:n}))||void 0===r||r.draw(t))}},e}(Ae),Ne=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.drawImp=function(t){var e,i,r=this.getWidget(),n=this.getWidget().getPane(),o=n.getChart(),a=r.getBounding(),s=o.getStyles().grid;if(s.show){t.save(),t.globalCompositeOperation="destination-over";var l=s.horizontal;if(l.show){var u=n.getYAxisComponentById().getTicks().map((function(t){return{coordinates:[{x:0,y:t.coord},{x:a.width,y:t.coord}]}}));null===(e=this.createFigure({name:"line",attrs:u,styles:l}))||void 0===e||e.draw(t)}var c=s.vertical;if(c.show){u=o.getXAxisPane().getXAxisComponent().getTicks().map((function(t){return{coordinates:[{x:t.coord,y:0},{x:t.coord,y:a.height}]}}));null===(i=this.createFigure({name:"line",attrs:u,styles:c}))||void 0===i||i.draw(t)}t.restore()}},e}(Ae),He=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.getCandleBarOptions=function(){var t,e,i=this.getWidget().getPane(),r=i.getChart().getChartStore(),n=r.getIndicatorsByPaneId(i.getId());try{for(var o=s(n),a=o.next();!a.done;a=o.next()){var l=a.value,u=i.getYAxisComponentById(l.yAxisId);if(l.shouldOhlc&&l.visible&&!u.isInCandle()){var c=l.styles,h=r.getStyles().indicator,d=V(c,"ohlc.compareRule",h.ohlc.compareRule),p=V(c,"ohlc.upColor",h.ohlc.upColor),g=V(c,"ohlc.downColor",h.ohlc.downColor),v=V(c,"ohlc.noChangeColor",h.ohlc.noChangeColor);return{yAxisId:l.yAxisId,type:"ohlc",styles:{compareRule:d,upColor:p,downColor:g,noChangeColor:v,upBorderColor:p,downBorderColor:g,noChangeBorderColor:v,upWickColor:p,downWickColor:g,noChangeWickColor:v}}}}}catch(e){t={error:e}}finally{try{a&&!a.done&&(e=o.return)&&e.call(o)}finally{if(t)throw t.error}}return null},e.prototype.drawImp=function(e){var i=this;t.prototype.drawImp.call(this,e);var n=this.getWidget(),o=n.getPane(),a=o.getChart(),s=n.getBounding(),l=a.getXAxisPane().getXAxisComponent(),u=a.getChartStore(),c=u.getIndicatorsByPaneId(o.getId()),h=u.getStyles().indicator;e.save(),c.forEach((function(t){var n=o.getYAxisComponentById(t.yAxisId);if(t.visible){t.zLevel<0?e.globalCompositeOperation="destination-over":e.globalCompositeOperation="source-over";var u=!1;if(null!==t.draw&&(e.save(),u=t.draw({ctx:e,chart:a,indicator:t,bounding:s,xAxis:l,yAxis:n}),e.restore()),!u){var c=t.result,d=[];i.eachChildren((function(o,a){var u,p,g,y=a.halfGapBar,m=o.dataIndex,_=o.x,x=l.convertToPixel(m-1),b=l.convertToPixel(m+1),w=null!==(u=c[m-1])&&void 0!==u?u:null,C=null!==(p=c[m])&&void 0!==p?p:null,E=null!==(g=c[m+1])&&void 0!==g?g:null,I={x:x},T={x:_},S={x:b};t.figures.forEach((function(t){var e=t.key,i=null==w?void 0:w[e];v(i)&&(I[e]=n.convertToPixel(i));var r=null==C?void 0:C[e];v(r)&&(T[e]=n.convertToPixel(r));var o=null==E?void 0:E[e];v(o)&&(S[e]=n.convertToPixel(o))})),Dt(t,m,a,h,(function(t,o,u){var c,h,p,g,m;if(f(null==C?void 0:C[t.key])){var x=T[t.key],b=null===(c=t.attrs)||void 0===c?void 0:c.call(t,{data:{prev:w,current:C,next:E},coordinate:{prev:I,current:T,next:S},bounding:s,barSpace:a,xAxis:l,yAxis:n});switch(t.type){case"text":b=r({x:_,y:x,text:null==C?void 0:C[t.key],align:"center",baseline:"middle"},b);break;case"circle":b=r({x:_,y:x,r:Math.max(1,y)},b);break;case"rect":case"bar":var A=null!==(h=t.baseValue)&&void 0!==h?h:n.getRange().from,M=n.convertToPixel(A),P=Math.abs(M-x);A!==(null==C?void 0:C[t.key])&&(P=Math.max(1,P));var D=0;D=x>M?M:x;var k=null!==(p=null==b?void 0:b.width)&&void 0!==p?p:2*y;b=r({x:_-k/2,y:D,width:Math.max(1,k),height:P},b);break;case"line":f(d[u])||(d[u]=[]),v(T[t.key])&&v(S[t.key])&&d[u].push({coordinates:null!==(g=null==b?void 0:b.coordinates)&&void 0!==g?g:[{x:T.x,y:T[t.key]},{x:S.x,y:S[t.key]}],styles:o})}var B=t.type;f(b)&&"line"!==B&&(null===(m=i.createFigure({name:"bar"===B?"rect":B,attrs:b,styles:o}))||void 0===m||m.draw(e))}}))})),d.forEach((function(t){var r,n,o,a;if(t.length>1){for(var s=[{coordinates:[t[0].coordinates[0],t[0].coordinates[1]],styles:t[0].styles}],l=1;l<t.length;l++){var u=s[s.length-1],c=t[l],h=u.coordinates[u.coordinates.length-1];h.x===c.coordinates[0].x&&h.y===c.coordinates[0].y&&u.styles.style===c.styles.style&&u.styles.color===c.styles.color&&u.styles.size===c.styles.size&&u.styles.smooth===c.styles.smooth&&(null===(r=u.styles.dashedValue)||void 0===r?void 0:r[0])===(null===(n=c.styles.dashedValue)||void 0===n?void 0:n[0])&&(null===(o=u.styles.dashedValue)||void 0===o?void 0:o[1])===(null===(a=c.styles.dashedValue)||void 0===a?void 0:a[1])?u.coordinates.push(c.coordinates[1]):s.push({coordinates:[c.coordinates[0],c.coordinates[1]],styles:c.styles})}s.forEach((function(t){var r,n=t.coordinates,o=t.styles;null===(r=i.createFigure({name:"line",attrs:{coordinates:n},styles:o}))||void 0===r||r.draw(e)}))}}))}}})),e.restore()},e}(De);function Xe(t,e){var i,r=null!==(i=null==e?void 0:e.ignoreEvent)&&void 0!==i&&i;return y(r)?!r:!r.includes(t)}var Ue="overlay_figure_",Ge=function(){function t(t){this.groupId="",this.totalStep=1,this.currentStep=1,this.drawingMode="step",this.lock=!1,this.visible=!0,this.zLevel=0,this.needDefaultPointFigure=!1,this.needDefaultXAxisFigure=!1,this.needDefaultYAxisFigure=!1,this.mode="normal",this.modeSensitivity=8,this.points=[],this.styles=null,this.createPointFigures=null,this.createXAxisFigures=null,this.createYAxisFigures=null,this.performEventPressedMove=null,this.performEventMoveForDrawing=null,this.onDrawStart=null,this.onDrawing=null,this.onDrawEnd=null,this.onClick=null,this.onDoubleClick=null,this.onRightClick=null,this.onPressedMoveStart=null,this.onPressedMoving=null,this.onPressedMoveEnd=null,this.onMouseMove=null,this.onMouseEnter=null,this.onMouseLeave=null,this.onRemoved=null,this.onSelected=null,this.onDeselected=null,this._prevZLevel=0,this._prevPressedPoint=null,this._prevPressedPoints=[],this.override(t)}return t.prototype.override=function(t){var e,i;this._prevOverlay=h(r(r({},this),{_prevOverlay:null}));var o=t.id,a=t.name;t.currentStep;var s=t.points,p=t.styles;if(c(this,n(t,["id","name","currentStep","points","styles"])),m(this.name)||(this.name=null!=a?a:""),!m(this.id)&&m(o)&&(this.id=o),f(p)&&(null!==(e=this.styles)&&void 0!==e||(this.styles={}),c(this.styles,p)),d(s)&&s.length>0){this.points=u([],l(s),!1),this.currentStep=-1;var g=this.points.length-1,v=this.points[g];g>0&&f(v)&&(null===(i=this.performEventPressedMove)||void 0===i||i.call(this,{currentStep:this.currentStep,mode:this.mode,points:this.points,performPointIndex:g,performPoint:v}))}},t.prototype.getPrevZLevel=function(){return this._prevZLevel},t.prototype.setPrevZLevel=function(t){this._prevZLevel=t},t.prototype.shouldUpdate=function(){var t=this._prevOverlay.zLevel!==this.zLevel;return{sort:t,draw:t||JSON.stringify(this._prevOverlay.points)!==JSON.stringify(this.points)||this._prevOverlay.visible!==this.visible||this._prevOverlay.extendData!==this.extendData||this._prevOverlay.styles!==this.styles}},t.prototype.nextStep=function(){this.currentStep===this.totalStep-1?this.currentStep=-1:this.currentStep++},t.prototype.forceComplete=function(){this.currentStep=-1},t.prototype.isDrawing=function(){return-1!==this.currentStep},t.prototype.isStart=function(){return 1===this.currentStep},t.prototype.isContinuousDrawingMode=function(){return"continuous"===this.drawingMode},t.prototype.startContinuousDrawing=function(t){this.points=[],this.continuousDrawingModeEventMoveForDrawing(t),this.currentStep=2},t.prototype.continuousDrawingModeEventMoveForDrawing=function(t){var e={};return v(t.timestamp)&&(e.timestamp=t.timestamp),v(t.dataIndex)&&(e.dataIndex=t.dataIndex),v(t.value)&&(e.value=t.value),this.points.push(e),!0},t.prototype.stepDrawingModeEventMoveForDrawing=function(t){var e,i=this.currentStep-1,r={};v(t.timestamp)&&(r.timestamp=t.timestamp),v(t.dataIndex)&&(r.dataIndex=t.dataIndex),v(t.value)&&(r.value=t.value),this.points[i]=r,null===(e=this.performEventMoveForDrawing)||void 0===e||e.call(this,{currentStep:this.currentStep,mode:this.mode,points:this.points,performPointIndex:i,performPoint:r})},t.prototype.eventPressedPointMove=function(t,e){var i;v(t.timestamp)&&(this.points[e].timestamp=t.timestamp),v(t.dataIndex)&&(this.points[e].dataIndex=t.dataIndex),v(t.value)&&(this.points[e].value=t.value),null===(i=this.performEventPressedMove)||void 0===i||i.call(this,{currentStep:this.currentStep,points:this.points,mode:this.mode,performPointIndex:e,performPoint:this.points[e]})},t.prototype.startPressedMove=function(t){this._prevPressedPoint=r({},t),this._prevPressedPoints=h(this.points)},t.prototype.eventPressedOtherMove=function(t,e){var i=this;if(null!==this._prevPressedPoint){var n=null;v(t.dataIndex)&&v(this._prevPressedPoint.dataIndex)&&(n=t.dataIndex-this._prevPressedPoint.dataIndex);var o=null;v(t.value)&&v(this._prevPressedPoint.value)&&(o=t.value-this._prevPressedPoint.value),this.points=this._prevPressedPoints.map((function(t){var a,s,l=r({},t);if(v(n)&&(v(t.dataIndex)||v(t.timestamp))){var u=v(t.timestamp)?i.isContinuousDrawingMode()?e.timestampToFloatIndex(t.timestamp):e.timestampToDataIndex(t.timestamp):t.dataIndex;l.dataIndex=u+n,l.timestamp=i.isContinuousDrawingMode()?null!==(a=e.floatIndexToTimestamp(l.dataIndex))&&void 0!==a?a:void 0:null!==(s=e.dataIndexToTimestamp(l.dataIndex))&&void 0!==s?s:void 0}return v(o)&&v(t.value)&&(l.value=t.value+o),l}))}},t.extend=function(e){return function(t){function r(){return t.call(this,e)||this}return i(r,t),r}(t)},t}(),Ze=function(t){function e(e){var i=t.call(this,e)||this;return i._initEvent(),i}return i(e,t),e.prototype._initEvent=function(){var t=this,e=this.getWidget(),i=e.getPane(),n=i.getId(),o=i.getChart(),a=o.getChartStore();this.registerEvent("mouseMoveEvent",(function(i){var s,l=a.getProgressOverlayInfo();if(null!==l){var u=l.overlay,c=l.paneId;u.isStart()&&(a.updateProgressOverlayInfo(n),c=n);var h=u.points.length-1;return u.isDrawing()&&c===n&&(u.stepDrawingModeEventMoveForDrawing(t._coordinateToPoint(u,i)),null===(s=u.onDrawing)||void 0===s||s.call(u,r({chart:o,overlay:u},i))),t._figureMouseMoveEvent(u,"point",h,{key:"".concat(Ue,"point_").concat(h),type:"circle",attrs:{}})(i)}return a.setHoverOverlayInfo({paneId:n,overlay:null,figureType:"none",figureIndex:-1,figure:null},(function(e,r){return t._processOverlayMouseEnterEvent(e,r,i)}),(function(e,r){return t._processOverlayMouseLeaveEvent(e,r,i)})),e.setForceCursor(null),!1})).registerEvent("mouseClickEvent",(function(e){var i,s,l=a.getProgressOverlayInfo();if(null!==l){var u=l.overlay,c=l.paneId;u.isStart()&&(a.updateProgressOverlayInfo(n,!0),c=n);var h=u.points.length-1;return u.isDrawing()&&c===n&&(u.stepDrawingModeEventMoveForDrawing(t._coordinateToPoint(u,e)),null===(i=u.onDrawing)||void 0===i||i.call(u,r({chart:o,overlay:u},e)),u.nextStep(),u.isDrawing()||(a.progressOverlayComplete(),null===(s=u.onDrawEnd)||void 0===s||s.call(u,r({chart:o,overlay:u},e)))),t._figureMouseClickEvent(u,"point",h,{key:"".concat(Ue,"point_").concat(h),type:"circle",attrs:{}})(e)}return a.setClickOverlayInfo({paneId:n,overlay:null,figureType:"none",figureIndex:-1,figure:null},(function(i,r){return t._processOverlaySelectedEvent(i,r,e)}),(function(i,r){return t._processOverlayDeselectedEvent(i,r,e)})),!1})).registerEvent("mouseDoubleClickEvent",(function(e){var i,s=a.getProgressOverlayInfo();if(null!==s){var l=s.overlay,u=s.paneId;l.isDrawing()&&u===n&&(l.forceComplete(),l.isDrawing()||(a.progressOverlayComplete(),null===(i=l.onDrawEnd)||void 0===i||i.call(l,r({chart:o,overlay:l},e))));var c=l.points.length-1;return t._figureMouseClickEvent(l,"point",c,{key:"".concat(Ue,"point_").concat(c),type:"circle",attrs:{}})(e)}return!1})).registerEvent("mouseRightClickEvent",(function(e){var i=a.getProgressOverlayInfo();if(null!==i){var r=i.overlay;if(r.isDrawing()){var n=r.points.length-1;return t._figureMouseRightClickEvent(r,"point",n,{key:"".concat(Ue,"point_").concat(n),type:"circle",attrs:{}})(e)}}return!1})).registerEvent("mouseDownEvent",(function(e){var i,s=a.getProgressOverlayInfo();if(null!==s){var l=s.overlay;if(l.isContinuousDrawingMode()&&l.isStart()){a.updateProgressOverlayInfo(n,!0);var u=t._coordinateToPoint(l,e);return l.startContinuousDrawing(u),null===(i=l.onDrawStart)||void 0===i||i.call(l,r({chart:o,overlay:l},e)),!0}}return!1})).registerEvent("mouseUpEvent",(function(t){var e,i,s=a.getProgressOverlayInfo();if(null!==s){var l=s.overlay;if(l.isContinuousDrawingMode()&&l.isDrawing()&&!l.isStart())return l.forceComplete(),a.progressOverlayComplete(),null===(e=l.onDrawEnd)||void 0===e||e.call(l,r({chart:o,overlay:l},t)),!0}var u=a.getPressedOverlayInfo(),c=u.overlay,h=u.figure;return null!==c&&Xe("onPressedMoveEnd",h)&&(null===(i=c.onPressedMoveEnd)||void 0===i||i.call(c,r({chart:o,overlay:c,figure:null!=h?h:void 0},t))),a.setPressedOverlayInfo({paneId:n,overlay:null,figureType:"none",figureIndex:-1,figure:null}),!1})).registerEvent("pressedMouseMoveEvent",(function(e){var i,n,s=a.getProgressOverlayInfo();if(null!==s){var l=s.overlay;if(l.isContinuousDrawingMode()&&l.isDrawing()&&!l.isStart()){var u=t._coordinateToPoint(l,e);return l.continuousDrawingModeEventMoveForDrawing(u),null===(i=l.onDrawing)||void 0===i||i.call(l,r({chart:o,overlay:l},e)),t.getWidget().setForceCursor("pointer"),!0}}var c=a.getPressedOverlayInfo(),h=c.overlay,d=c.figureType,p=c.figureIndex,g=c.figure;if(null!==h&&Xe("onPressedMoving",g)&&!h.lock){u=t._coordinateToPoint(h,e);"point"===d?h.eventPressedPointMove(u,p):h.eventPressedOtherMove(u,t.getWidget().getPane().getChart().getChartStore());var v=!1;return null===(n=h.onPressedMoving)||void 0===n||n.call(h,r(r({chart:o,overlay:h,figure:null!=g?g:void 0},e),{preventDefault:function(){v=!0}})),v?t.getWidget().setForceCursor(null):t.getWidget().setForceCursor("pointer"),!0}return t.getWidget().setForceCursor(null),!1}))},e.prototype._createFigureEvents=function(t,e,i,r){return t.isDrawing()?null:{mouseMoveEvent:this._figureMouseMoveEvent(t,e,i,r),mouseDownEvent:this._figureMouseDownEvent(t,e,i,r),mouseClickEvent:this._figureMouseClickEvent(t,e,i,r),mouseRightClickEvent:this._figureMouseRightClickEvent(t,e,i,r),mouseDoubleClickEvent:this._figureMouseDoubleClickEvent(t,e,i,r)}},e.prototype._processOverlayMouseEnterEvent=function(t,e,i){return!(!p(t.onMouseEnter)||!Xe("onMouseEnter",e))&&(t.onMouseEnter(r({chart:this.getWidget().getPane().getChart(),overlay:t,figure:null!=e?e:void 0},i)),!0)},e.prototype._processOverlayMouseLeaveEvent=function(t,e,i){return!(!p(t.onMouseLeave)||!Xe("onMouseLeave",e))&&(t.onMouseLeave(r({chart:this.getWidget().getPane().getChart(),overlay:t,figure:null!=e?e:void 0},i)),!0)},e.prototype._processOverlaySelectedEvent=function(t,e,i){var n;return!!Xe("onSelected",e)&&(null===(n=t.onSelected)||void 0===n||n.call(t,r({chart:this.getWidget().getPane().getChart(),overlay:t,figure:null!=e?e:void 0},i)),!0)},e.prototype._processOverlayDeselectedEvent=function(t,e,i){var n;return!!Xe("onDeselected",e)&&(null===(n=t.onDeselected)||void 0===n||n.call(t,r({chart:this.getWidget().getPane().getChart(),overlay:t,figure:null!=e?e:void 0},i)),!0)},e.prototype._figureMouseMoveEvent=function(t,e,i,n){var o=this;return function(a){var s,l=o.getWidget().getPane(),u=!t.isDrawing()&&Xe("onMouseMove",n);if(u){var c=!1;null===(s=t.onMouseMove)||void 0===s||s.call(t,r(r({chart:l.getChart(),overlay:t,figure:n},a),{preventDefault:function(){c=!0}})),c?o.getWidget().setForceCursor(null):o.getWidget().setForceCursor("pointer")}return l.getChart().getChartStore().setHoverOverlayInfo({paneId:l.getId(),overlay:t,figureType:e,figure:n,figureIndex:i},(function(t,e){return o._processOverlayMouseEnterEvent(t,e,a)}),(function(t,e){return o._processOverlayMouseLeaveEvent(t,e,a)})),u}},e.prototype._figureMouseDownEvent=function(t,e,i,n){var o=this;return function(a){var s;if(t.lock)return!1;var l=o.getWidget().getPane(),u=l.getId();return t.startPressedMove(o._coordinateToPoint(t,a)),!!Xe("onPressedMoveStart",n)&&(null===(s=t.onPressedMoveStart)||void 0===s||s.call(t,r({chart:l.getChart(),overlay:t,figure:n},a)),l.getChart().getChartStore().setPressedOverlayInfo({paneId:u,overlay:t,figureType:e,figureIndex:i,figure:n}),!t.isDrawing())}},e.prototype._figureMouseClickEvent=function(t,e,i,n){var o=this;return function(a){var s,l=o.getWidget().getPane(),u=l.getId(),c=!t.isDrawing()&&Xe("onClick",n);return c&&(null===(s=t.onClick)||void 0===s||s.call(t,r({chart:o.getWidget().getPane().getChart(),overlay:t,figure:n},a))),l.getChart().getChartStore().setClickOverlayInfo({paneId:u,overlay:t,figureType:e,figureIndex:i,figure:n},(function(t,e){return o._processOverlaySelectedEvent(t,e,a)}),(function(t,e){return o._processOverlayDeselectedEvent(t,e,a)})),c}},e.prototype._figureMouseDoubleClickEvent=function(t,e,i,n){var o=this;return function(e){var i;return!!Xe("onDoubleClick",n)&&(null===(i=t.onDoubleClick)||void 0===i||i.call(t,r(r({},e),{chart:o.getWidget().getPane().getChart(),figure:n,overlay:t})),!t.isDrawing())}},e.prototype._figureMouseRightClickEvent=function(t,e,i,n){var o=this;return function(e){var i;if(Xe("onRightClick",n)){var a=!1;return null===(i=t.onRightClick)||void 0===i||i.call(t,r(r({chart:o.getWidget().getPane().getChart(),overlay:t,figure:n},e),{preventDefault:function(){a=!0}})),a||o.getWidget().getPane().getChart().getChartStore().removeOverlay(t),!t.isDrawing()}return!1}},e.prototype._coordinateToPoint=function(t,e){var i,r,n={},o=this.getWidget().getPane(),a=o.getChart(),s=o.getId(),l=a.getChartStore();if(this.coordinateToPointTimestampDataIndexFlag())if(t.isContinuousDrawingMode()){var u=l.coordinateToFloatIndex(e.x);n.dataIndex=u,n.timestamp=null!==(i=l.floatIndexToTimestamp(u))&&void 0!==i?i:void 0}else{var c=a.getXAxisPane().getXAxisComponent().convertFromPixel(e.x);n.dataIndex=c,n.timestamp=null!==(r=l.dataIndexToTimestamp(c))&&void 0!==r?r:void 0}if(this.coordinateToPointValueFlag()){var h=o.getYAxisComponentById(),d=h.convertFromPixel(e.y);if("normal"!==t.mode&&s===j&&v(n.dataIndex)){var p=l.getDataByDataIndex(n.dataIndex);if(null!==p){var g=t.modeSensitivity;if(d>p.high)if("weak_magnet"===t.mode){var f=h.convertToPixel(p.high),y=h.reverse?f+g:f-g;d<h.convertFromPixel(y)&&(d=p.high)}else d=p.high;else if(d<p.low)if("weak_magnet"===t.mode){var m=h.convertToPixel(p.low);y=h.reverse?m-g:m+g;d>h.convertFromPixel(y)&&(d=p.low)}else d=p.low;else{var _=Math.max(p.open,p.close),x=Math.min(p.open,p.close);d=d>_?d-_<p.high-d?_:p.high:d<x?d-p.low<x-d?p.low:x:_-d<d-x?_:x}}}n.value=d}return n},e.prototype.coordinateToPointValueFlag=function(){return!0},e.prototype.coordinateToPointTimestampDataIndexFlag=function(){return!0},e.prototype.dispatchEvent=function(e,i){return this.getWidget().getPane().getChart().getChartStore().isOverlayDrawing()?this.onEvent(e,i):t.prototype.dispatchEvent.call(this,e,i)},e.prototype.drawImp=function(t){var e=this;this.getCompleteOverlays().forEach((function(i){i.visible&&e._drawOverlay(t,i)}));var i=this.getProgressOverlay();f(i)&&i.visible&&this._drawOverlay(t,i)},e.prototype._drawOverlay=function(t,e){var i=e.points,r=this.getWidget().getPane(),n=r.getChart().getChartStore(),o=r.getYAxisComponentById(),a=e.isContinuousDrawingMode(),s=i.map((function(t){var e,i=null;a&&v(t.timestamp)?i=n.timestampToFloatIndex(t.timestamp):v(t.timestamp)?i=n.timestampToDataIndex(t.timestamp):v(t.dataIndex)&&(i=t.dataIndex);var r={x:0,y:0};return v(i)&&(r.x=n.dataIndexToCoordinate(i)),v(t.value)&&(r.y=null!==(e=null==o?void 0:o.convertToPixel(t.value))&&void 0!==e?e:0),r}));if(s.length>0){var l=[];l=l.concat(this.getFigures(e,s)),this.drawFigures(t,e,l)}this.drawDefaultFigures(t,e,s)},e.prototype.drawFigures=function(t,e,i){var n=this,o=this.getWidget().getPane().getChart().getStyles().overlay;i.forEach((function(i,a){var s=i.type,l=i.styles,u=i.attrs;[].concat(u).forEach((function(u){var c,h,d=n._createFigureEvents(e,"other",a,i),p=r(r(r({},o[s]),null===(c=e.styles)||void 0===c?void 0:c[s]),l);null===(h=n.createFigure({name:s,attrs:u,styles:p},null!=d?d:void 0))||void 0===h||h.draw(t)}))}))},e.prototype.getCompleteOverlays=function(){var t=this.getWidget().getPane();return t.getChart().getChartStore().getOverlaysByPaneId(t.getId())},e.prototype.getProgressOverlay=function(){var t=this.getWidget().getPane(),e=t.getChart().getChartStore().getProgressOverlayInfo();return f(e)&&e.paneId===t.getId()?e.overlay:null},e.prototype.getFigures=function(t,e){var i,r,n=this.getWidget(),o=n.getPane(),a=o.getChart(),s=o.getYAxisComponentById(),l=a.getXAxisPane().getXAxisComponent(),u=n.getBounding();return null!==(r=null===(i=t.createPointFigures)||void 0===i?void 0:i.call(t,{chart:a,overlay:t,coordinates:e,bounding:u,xAxis:l,yAxis:s}))&&void 0!==r?r:[]},e.prototype.drawDefaultFigures=function(t,e,i){var n,o,a=this;if(e.needDefaultPointFigure){var s=this.getWidget().getPane().getChart().getChartStore(),l=s.getHoverOverlayInfo(),u=s.getClickOverlayInfo();if((null===(n=l.overlay)||void 0===n?void 0:n.id)===e.id&&"none"!==l.figureType||(null===(o=u.overlay)||void 0===o?void 0:o.id)===e.id&&"none"!==u.figureType){var c=s.getStyles().overlay,h=e.styles,d=r(r({},c.point),null==h?void 0:h.point);i.forEach((function(i,r){var n,o,s,u,c,h=i.x,p=i.y,g=d.radius,v=d.color,f=d.borderColor,y=d.borderSize;(null===(n=l.overlay)||void 0===n?void 0:n.id)===e.id&&"point"===l.figureType&&(null===(o=l.figure)||void 0===o?void 0:o.key)==="".concat(Ue,"point_").concat(r)&&(g=d.activeRadius,v=d.activeColor,f=d.activeBorderColor,y=d.activeBorderSize),null===(u=a.createFigure({name:"circle",attrs:{x:h,y:p,r:g+y},styles:{color:f}},null!==(s=a._createFigureEvents(e,"point",r,{key:"".concat(Ue,"point_").concat(r),type:"circle",attrs:{x:h,y:p,r:g+y},styles:{color:f}}))&&void 0!==s?s:void 0))||void 0===u||u.draw(t),null===(c=a.createFigure({name:"circle",attrs:{x:h,y:p,r:g},styles:{color:v}}))||void 0===c||c.draw(t)}))}}},e}(Ae),je=null;var qe=function(){function t(t,e){var i=this;this._resizeObserver=null,this._mediaQueryList=null,this._destroyed=!1,this._resizePending=!1,this._sizeInitialized=!1,this._width=0,this._height=0,this._pixelWidth=0,this._pixelHeight=0,this._nextPixelWidth=0,this._nextPixelHeight=0,this._requestAnimationId=_,this._mediaQueryListener=function(){i._destroyed||(i._observePixelRatio(),i._resize(I(i._element)))},this._listener=e,this._element=A("canvas",t),this._ctx=this._element.getContext("2d"),function(){return o(this,void 0,void 0,(function(){return a(this,(function(t){switch(t.label){case 0:return null!=je||(je=new Promise((function(t){var e=new ResizeObserver((function(i){t(i.every((function(t){var e;return f(null===(e=t.devicePixelContentBoxSize)||void 0===e?void 0:e[0])}))),e.disconnect()}));e.observe(document.body,{box:"device-pixel-content-box"})})).catch((function(){return!1}))),[4,je];case 1:return[2,t.sent()]}}))}))}().then((function(t){i._destroyed||(t?(i._resizeObserver=new ResizeObserver((function(t){var e=t.find((function(t){return t.target===i._element})),r=null==e?void 0:e.devicePixelContentBoxSize[0];i._sizeInitialized&&f(r)&&(i._nextPixelWidth=r.inlineSize,i._nextPixelHeight=r.blockSize,i._pixelWidth===i._nextPixelWidth&&i._pixelHeight===i._nextPixelHeight||i._scheduleDraw(!0))})),i._resizeObserver.observe(i._element,{box:"device-pixel-content-box"})):i._observePixelRatio())})).catch((function(t){return!1}))}return t.prototype._observePixelRatio=function(){var t,e;f(this._mediaQueryList)&&this._mediaQueryList.removeListener(this._mediaQueryListener);var i=this._element.ownerDocument.defaultView;this._mediaQueryList=null!==(t=null==i?void 0:i.matchMedia("(resolution: ".concat(I(this._element),"dppx)")))&&void 0!==t?t:null,null===(e=this._mediaQueryList)||void 0===e||e.addListener(this._mediaQueryListener)},t.prototype._resize=function(t){this._nextPixelWidth=Math.round(this._width*t),this._nextPixelHeight=Math.round(this._height*t),this._scheduleDraw(!0)},t.prototype._scheduleDraw=function(t){var e=this;void 0===t&&(t=!1),this._resizePending||(this._resizePending=t),this._requestAnimationId===_&&(this._requestAnimationId=x((function(){if(e._requestAnimationId=_,!e._destroyed){e._resizePending&&(e._resizePending=!1,e._pixelWidth=e._nextPixelWidth,e._pixelHeight=e._nextPixelHeight,e._element.width=e._pixelWidth,e._element.height=e._pixelHeight),e._ctx.setTransform(1,0,0,1,0,0),e._ctx.clearRect(0,0,e._pixelWidth,e._pixelHeight),e._ctx.save(),e._width>0&&e._height>0&&e._ctx.scale(e._pixelWidth/e._width,e._pixelHeight/e._height);try{e._listener()}finally{e._ctx.restore()}}})))},t.prototype.update=function(t,e){this._sizeInitialized&&this._width===t&&this._height===e?this._scheduleDraw():(this._sizeInitialized=!0,this._width=t,this._height=e,this._element.style.width="".concat(t,"px"),this._element.style.height="".concat(e,"px"),this._resize(I(this._element)))},t.prototype.getElement=function(){return this._element},t.prototype.getContext=function(){return this._ctx},t.prototype.destroy=function(){this._destroyed=!0,this._requestAnimationId!==_&&(b(this._requestAnimationId),this._requestAnimationId=_),f(this._resizeObserver)&&(this._resizeObserver.disconnect(),this._resizeObserver=null),f(this._mediaQueryList)&&(this._mediaQueryList.removeListener(this._mediaQueryListener),this._mediaQueryList=null)},t}(),Ke=function(t){function e(e,i){var r=t.call(this)||this;return r._bounding=C(),r._cursor="crosshair",r._forceCursor=null,r._pane=i,r._rootContainer=e,r._container=r.createContainer(),e.appendChild(r._container),r}return i(e,t),e.prototype.setBounding=function(t){return c(this._bounding,t),this},e.prototype.getContainer=function(){return this._container},e.prototype.getBounding=function(){return this._bounding},e.prototype.getPane=function(){return this._pane},e.prototype.checkEventOn=function(t){return!0},e.prototype.setCursor=function(t){m(this._forceCursor)||t!==this._cursor&&(this._cursor=t,this._container.style.cursor=this._cursor)},e.prototype.setForceCursor=function(t){var e;t!==this._forceCursor&&(this._forceCursor=t,this._container.style.cursor=null!==(e=this._forceCursor)&&void 0!==e?e:this._cursor)},e.prototype.getForceCursor=function(){return this._forceCursor},e.prototype.update=function(t){this.updateImp(this._container,this._bounding,null!=t?t:3)},e.prototype.destroy=function(){this._rootContainer.removeChild(this._container)},e}(Kt),Qe=function(t){function e(e,i){var r=t.call(this,e,i)||this;r._mainCanvas=new qe({position:"absolute",top:"0",left:"0",zIndex:"2",boxSizing:"border-box"},(function(){r.updateMain(r._mainCanvas.getContext())})),r._overlayCanvas=new qe({position:"absolute",top:"0",left:"0",zIndex:"2",boxSizing:"border-box"},(function(){r.updateOverlay(r._overlayCanvas.getContext())}));var n=r.getContainer();return n.appendChild(r._mainCanvas.getElement()),n.appendChild(r._overlayCanvas.getElement()),r}return i(e,t),e.prototype.createContainer=function(){return A("div",{margin:"0",padding:"0",position:"absolute",top:"0",overflow:"hidden",boxSizing:"border-box",zIndex:"1"})},e.prototype.updateImp=function(t,e,i){var r=e.width,n=e.height,o=e.left;t.style.left="".concat(o,"px");var a=i,s=t.clientWidth,l=t.clientHeight;switch(r===s&&n===l||(t.style.width="".concat(r,"px"),t.style.height="".concat(n,"px"),a=3),a){case 0:this._mainCanvas.update(r,n);break;case 1:this._overlayCanvas.update(r,n);break;case 3:case 4:this._mainCanvas.update(r,n),this._overlayCanvas.update(r,n)}},e.prototype.destroy=function(){this._mainCanvas.destroy(),this._overlayCanvas.destroy(),t.prototype.destroy.call(this)},e.prototype.getImage=function(t){var e=this.getBounding(),i=e.width,r=e.height,n=A("canvas",{width:"".concat(i,"px"),height:"".concat(r,"px"),boxSizing:"border-box"}),o=n.getContext("2d"),a=I(n);return n.width=i*a,n.height=r*a,o.scale(a,a),o.drawImage(this._mainCanvas.getElement(),0,0,i,r),t&&o.drawImage(this._overlayCanvas.getElement(),0,0,i,r),n},e}(Ke),$e=function(t){function e(e,i){var r=t.call(this,e,i)||this;return r._gridView=new Ne(r),r._indicatorView=new He(r),r._crosshairLineView=new Ve(r),r._tooltipView=r.createTooltipView(),r._overlayView=new Ze(r),r.addChild(r._tooltipView),r.addChild(r._overlayView),r}return i(e,t),e.prototype.getName=function(){return bt},e.prototype.updateMain=function(t){this.updateMainContent(t),this._indicatorView.draw(t),this._gridView.draw(t)},e.prototype.createTooltipView=function(){return new Ye(this)},e.prototype.updateMainContent=function(t){},e.prototype.updateOverlayContent=function(t){},e.prototype.updateOverlay=function(t){this._overlayView.draw(t),this._crosshairLineView.draw(t),this.updateOverlayContent(t),this._tooltipView.draw(t)},e}(Qe),Je=function(t){function e(e,i){var r=t.call(this,e,i)||this;return r._candleBarView=new De(r),r._candleAreaView=new Pe(r),r._candleHighLowPriceView=new ke(r),r._candleLastPriceLineView=new Be(r),r._crosshairFeatureView=new ze(r),r.addChild(r._candleBarView),r.addChild(r._crosshairFeatureView),r}return i(e,t),e.prototype.updateMainContent=function(t){"area"!==this.getPane().getChart().getStyles().candle.type?(this._candleBarView.draw(t),this._candleHighLowPriceView.draw(t),this._candleAreaView.stopAnimation()):this._candleAreaView.draw(t),this._candleLastPriceLineView.draw(t)},e.prototype.updateOverlayContent=function(t){this._crosshairFeatureView.draw(t)},e.prototype.createTooltipView=function(){return new We(this)},e.prototype.destroy=function(){this._candleAreaView.stopAnimation(),t.prototype.destroy.call(this)},e}($e),ti={name:"logarithm",minSpan:function(t){return.05*L(-t)},valueToRealValue:function(t){return t<0?-R(Math.abs(t)):R(t)},realValueToDisplayValue:function(t){return t<0?-L(Math.abs(t)):L(t)},displayValueToRealValue:function(t){return t<0?-R(Math.abs(t)):R(t)},realValueToValue:function(t){return t<0?-L(Math.abs(t)):L(t)},createRange:function(t){var e=t.defaultRange,i=e.from,r=e.to,n=e.range,o=i<0?-R(Math.abs(i)):R(i),a=r<0?-R(Math.abs(r)):R(r);return{from:i,to:r,range:n,realFrom:o,realTo:a,realRange:a-o,displayFrom:i,displayTo:r,displayRange:n}}},ei={name:"percentage",minSpan:function(){return Math.pow(10,-2)},displayValueToText:function(t){return"".concat(H(t,2),"%")},valueToRealValue:function(t,e){var i=e.range;return 0===i.range?i.realFrom:(t-i.from)/i.range*i.realRange+i.realFrom},realValueToValue:function(t,e){var i=e.range;return 0===i.realRange?i.from:(t-i.realFrom)/i.realRange*i.range+i.from},createRange:function(t){var e=t.chart,i=t.defaultRange,r=e.getDataList()[e.getVisibleRange().from];if(f(r)){var n=i.from,o=i.to,a=i.range,s=r.close,l=0===s?0:(i.from-s)/s*100,u=0===s?0:(i.to-s)/s*100,c=u-l;return{from:n,to:o,range:a,realFrom:l,realTo:u,realRange:c,displayFrom:l,displayTo:u,displayRange:c}}return i}},ii={normal:J.extend({name:"normal"}),percentage:J.extend(ei),logarithm:J.extend(ti)};var ri=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.drawImp=function(t){var e,i,n,o,a=this,s=this.getWidget(),l=s.getPane(),u=s.getBounding(),c=l.getChart().getChartStore(),h=c.getStyles().candle.priceMark,d=h.last,p=d.text;if(h.show&&d.show&&p.show){var g=null!==(i=null===(e=c.getSymbol())||void 0===e?void 0:e.pricePrecision)&&void 0!==i?i:O,v=s.getAxisComponent(),y=c.getDataList(),m=y[y.length-1];if(f(m)){var _=m.close,x=m.open,b="current_open"===d.compareRule?x:null!==(o=null===(n=y[y.length-2])||void 0===n?void 0:n.close)&&void 0!==o?o:_,w=v.convertToNicePixel(_),C="";C=_>b?d.upColor:_<b?d.downColor:d.noChangeColor;var E=0,I="left";v.isFromZero()?(E=0,I="left"):(E=u.width,I="right");var T=[],A=v.getRange(),M=v.displayValueToText(v.realValueToDisplayValue(v.valueToRealValue(_,{range:A}),{range:A}),g);M=c.getDecimalFold().format(c.getThousandsSeparator().format(M));var P=p.paddingLeft,D=p.paddingRight,k=p.paddingTop,B=p.paddingBottom,F=p.size,R=p.family,L=P+S(M,F,p.weight,R)+D,Y=k+F+B;T.push({name:"text",attrs:{x:E,y:w,width:L,height:Y,text:M,align:I,baseline:"middle"},styles:r(r({},p),{backgroundColor:C})});var W=c.getInnerFormatter().formatExtendText,z=F/2,V=w-z-k,N=w+z+B;d.extendTexts.forEach((function(t,e){var i=W({type:"last_price",data:m,index:e});if(i.length>0&&t.show){var n=t.size/2,o=0;"above_price"===t.position?(o=V-=t.paddingBottom+n,V-=n+t.paddingTop):(o=N+=t.paddingTop+n,N+=n+t.paddingBottom),L=Math.max(L,t.paddingLeft+S(i,t.size,t.weight,t.family)+t.paddingRight),T.push({name:"text",attrs:{x:E,y:o,width:L,height:t.paddingTop+t.size+t.paddingBottom,text:i,align:I,baseline:"middle"},styles:r(r({},t),{backgroundColor:C})})}})),T.forEach((function(e){var i;e.attrs.width=L,null===(i=a.createFigure(e))||void 0===i||i.draw(t)}))}}},e}(Ae),ni=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.drawImp=function(t){var e,i=this.getWidget(),r=i.getPane(),n=i.getPane().getChart().getChartStore(),o=n.getCrosshair();if(m(o.paneId)&&this.compare(o,r.getId())){var a=n.getStyles().crosshair;if(a.show){var s=this.getDirectionStyles(a),l=s.text;if(s.show&&l.show){var u=i.getBounding(),c="getAxisComponent"in i?i.getAxisComponent():r.getYAxisComponentById(),h=this.getText(o,n,c);t.font=T(l.size,l.weight,l.family),null===(e=this.createFigure({name:"text",attrs:this.getTextAttrs(h,t.measureText(h).width,o,u,c,l),styles:l}))||void 0===e||e.draw(t)}}}},e.prototype.compare=function(t,e){return t.paneId===e},e.prototype.getDirectionStyles=function(t){return t.horizontal},e.prototype.getText=function(t,e,i){var r,n,o,a=i,s=i.convertFromPixel(t.y),l=0,u=!1;if(a.isInCandle())l=null!==(n=null===(r=e.getSymbol())||void 0===r?void 0:r.pricePrecision)&&void 0!==n?n:O;else{var c=a.id,h=this.getWidget().getPane();h.isManualYAxis(c)&&(c=null!==(o=h.getDefaultYAxisId())&&void 0!==o?o:c),e.getIndicatorsByPaneId(t.paneId).filter((function(t){return t.yAxisId===c})).forEach((function(t){l=Math.max(t.precision,l),u||(u=t.shouldFormatBigNumber)}))}var d=a.getRange(),p=a.displayValueToText(a.realValueToDisplayValue(a.valueToRealValue(s,{range:d}),{range:d}),l);return u&&(p=e.getInnerFormatter().formatBigNumber(p)),e.getDecimalFold().format(e.getThousandsSeparator().format(p))},e.prototype.getTextAttrs=function(t,e,i,r,n,o){var a=0,s="left";return n.isFromZero()?(a=0,s="left"):(a=r.width,s="right"),{x:a,y:i.y,text:t,align:s,baseline:"middle"}},e}(Ae),oi=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.drawImp=function(t){var e=this,i=this.getWidget(),n=i.getPane(),o=i.getBounding(),a=n.getChart().getChartStore(),s=a.getStyles().indicator,l=s.lastValueMark,u=l.text;if(l.show){var c=i.getAxisComponent(),h=c.getRange(),d=a.getDataList(),p=a.getBarSpace(),g=d.length-1,y=new Set([c.id]),m=n.getDefaultYAxisId();n.isManualYAxis(c.id)&&f(m)&&y.add(m);var _=a.getIndicatorsByPaneId(n.getId()).filter((function(t){return y.has(t.yAxisId)})),x=a.getInnerFormatter(),b=a.getDecimalFold(),w=a.getThousandsSeparator();_.forEach((function(i){var n,a=null!==(n=i.result[g])&&void 0!==n?n:{};if(f(a)&&i.visible){var l=i.precision;Dt(i,g,p,s,(function(n,s){var d,p=a[n.key];if(v(p)){var g=c.convertToNicePixel(p),f=c.displayValueToText(c.realValueToDisplayValue(c.valueToRealValue(p,{range:h}),{range:h}),l);i.shouldFormatBigNumber&&(f=x.formatBigNumber(f)),f=b.format(w.format(f));var y=0,m="left";c.isFromZero()?(y=0,m="left"):(y=o.width,m="right"),null===(d=e.createFigure({name:"text",attrs:{x:y,y:g,text:f,align:m,baseline:"middle"},styles:r(r({},u),{backgroundColor:s.color})}))||void 0===d||d.draw(t)}}))}}))}},e}(Ae),ai=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.coordinateToPointTimestampDataIndexFlag=function(){return!1},e.prototype.drawDefaultFigures=function(t,e,i){this.drawFigures(t,e,this.getDefaultFigures(e,i))},e.prototype.getDefaultFigures=function(t,e){var i,r=this.getWidget(),n=r.getPane(),o=n.getChart().getChartStore(),a=o.getClickOverlayInfo(),s=[];if(t.needDefaultYAxisFigure&&t.id===(null===(i=a.overlay)||void 0===i?void 0:i.id)&&a.paneId===n.getId()){var l=n.getYAxisComponentById(),u=r.getBounding(),c=Number.MAX_SAFE_INTEGER,h=Number.MIN_SAFE_INTEGER,d=l.isFromZero(),p="left",g=0;d?(p="left",g=0):(p="right",g=u.width);var f=o.getDecimalFold(),y=o.getThousandsSeparator();e.forEach((function(e,i){var r,n,a=t.points[i];if(v(a.value)){c=Math.min(c,e.y),h=Math.max(h,e.y);var l=f.format(y.format(H(a.value,null!==(n=null===(r=o.getSymbol())||void 0===r?void 0:r.pricePrecision)&&void 0!==n?n:O)));s.push({type:"text",attrs:{x:g,y:e.y,text:l,align:p,baseline:"middle"},ignoreEvent:!0})}})),e.length>1&&s.unshift({type:"rect",attrs:{x:0,y:c,width:u.width,height:h-c},ignoreEvent:!0})}return s},e.prototype.getFigures=function(t,e){var i,r,n=this.getWidget(),o=n.getPane(),a=o.getChart(),s=o.getYAxisComponentById(),l=a.getXAxisPane().getXAxisComponent(),u=n.getBounding();return null!==(r=null===(i=t.createYAxisFigures)||void 0===i?void 0:i.call(t,{chart:a,overlay:t,coordinates:e,bounding:u,xAxis:l,yAxis:s}))&&void 0!==r?r:[]},e}(Ze),si=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.drawImp=function(t){var e,i,r=this,n=this.getWidget(),o=n.getPane(),a=n.getBounding(),s=this.getAxis(),l=this.getAxisStyles(o.getChart().getStyles());if(l.show){l.axisLine.show&&(null===(e=this.createFigure({name:"line",attrs:this.createAxisLine(a,l),styles:l.axisLine}))||void 0===e||e.draw(t));var u=s.getTicks();if(l.tickLine.show)this.createTickLines(u,a,l).forEach((function(e){var i;null===(i=r.createFigure({name:"line",attrs:e,styles:l.tickLine}))||void 0===i||i.draw(t)}));if(l.tickText.show){var c=this.createTickTexts(u,a,l);null===(i=this.createFigure({name:"text",attrs:c,styles:l.tickText}))||void 0===i||i.draw(t)}}},e}(Ae),li=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.getAxis=function(){return this.getWidget().getAxisComponent()},e.prototype.getAxisStyles=function(t){return t.yAxis},e.prototype.createAxisLine=function(t,e){var i=this.getAxis(),r=e.axisLine.size,n=0;return{coordinates:[{x:n=i.isFromZero()?0:t.width-r,y:0},{x:n,y:t.height}]}},e.prototype.createTickLines=function(t,e,i){var r=this.getAxis(),n=i.axisLine,o=i.tickLine,a=0,s=0;return r.isFromZero()?(a=0,n.show&&(a+=n.size),s=a+o.length):(a=e.width,n.show&&(a-=n.size),s=a-o.length),t.map((function(t){return{coordinates:[{x:a,y:t.coord},{x:s,y:t.coord}]}}))},e.prototype.createTickTexts=function(t,e,i){var r=this.getAxis(),n=i.axisLine,o=i.tickLine,a=i.tickText,s=0;r.isFromZero()?(s=a.marginStart,n.show&&(s+=n.size),o.show&&(s+=o.length)):(s=e.width-a.marginEnd,n.show&&(s-=n.size),o.show&&(s-=o.length));var l=this.getAxis().isFromZero()?"left":"right";return t.map((function(t){return{x:s,y:t.coord,text:t.text,align:l,baseline:"middle"}}))},e}(si),ui=function(t){function e(e,i,r){var n=t.call(this,e,i)||this;return n._yAxisView=new li(n),n._candleLastPriceLabelView=new ri(n),n._indicatorLastValueView=new oi(n),n._overlayYAxisView=new ai(n),n._crosshairHorizontalLabelView=new ni(n),n._yAxis=r,n.setCursor("ns-resize"),n.addChild(n._overlayYAxisView),n}return i(e,t),e.prototype.getAxisComponent=function(){return this._yAxis},e.prototype.getName=function(){return Ct},e.prototype.updateMain=function(t){this._yAxisView.draw(t);var e=this.getPane();(e.isDefaultYAxis(this._yAxis.id)||e.isManualYAxis(this._yAxis.id))&&this.getAxisComponent().isInCandle()&&this._candleLastPriceLabelView.draw(t),this._indicatorLastValueView.draw(t)},e.prototype.updateOverlay=function(t){this._overlayYAxisView.draw(t),this._crosshairHorizontalLabelView.draw(t)},e}(Qe),ci=function(){function t(t,e){this._bounding=C(),this._chart=t,this._id=e,this._container=A("div",{width:"100%",margin:"0",padding:"0",position:"relative",overflow:"hidden",boxSizing:"border-box"})}return t.prototype.getContainer=function(){return this._container},t.prototype.getId=function(){return this._id},t.prototype.getChart=function(){return this._chart},t.prototype.getBounding=function(){return this._bounding},t.prototype.update=function(t){this._bounding.height!==this._container.clientHeight&&(this._container.style.height="".concat(this._bounding.height,"px")),this.updateImp(null!=t?t:3,this._container,this._bounding)},t}(),hi=function(t){function e(e,i){var r=t.call(this,e,i.id)||this;r._yAxisWidgets=new Map,r._yAxisComponents=new Map,r._manualYAxisIds=new Set,r._defaultYAxisId=null,r._yAxesBounding={};var n=r.getContainer();return r._mainWidget=r.createMainWidget(n),r._options=i,r}return i(e,t),e.prototype.setOptions=function(t){return c(this._options,t),v(t.height)&&t.height>0&&this.setBounding({height:this._options.height}),this},e.prototype.setAxisCursor=function(t,e){var i,r,n=null,o="default";this.getId()===K?(n=this.getMainWidget().getContainer(),o="ew-resize"):(n=null!==(r=null===(i=this.getYAxisWidgetById(e))||void 0===i?void 0:i.getContainer())&&void 0!==r?r:null,o="ns-resize"),f(n)&&y(t)&&(n.style.cursor=t?o:"default")},e.prototype.createOrOverrideYAxis=function(t){var e,i,n,o,a,s=r(r({},t),{paneId:this.getId()}),l=s.id,u=null!==(e=s.name)&&void 0!==e?e:"normal",c=null===(i=s.needWidget)||void 0===i||i,h=this._yAxisComponents.get(l);if(!f(h)||f(s.name)&&h.name!==s.name)null===(n=this._yAxisWidgets.get(l))||void 0===n||n.destroy(),this._yAxisWidgets.delete(l),(h=this.createYAxisComponent(u)).id=l,h.paneId=this.getId(),this._yAxisComponents.set(l,h),null!==(o=this._defaultYAxisId)&&void 0!==o||(this._defaultYAxisId=l),c&&f(d=this.createYAxisWidget(this.getContainer(),h))&&this._yAxisWidgets.set(l,d);else if(y(s.needWidget)&&f(h)){var d=this._yAxisWidgets.get(l);if(s.needWidget&&!f(d)){var p=this.createYAxisWidget(this.getContainer(),h);f(p)&&this._yAxisWidgets.set(l,p)}else!s.needWidget&&f(d)&&(d.destroy(),this._yAxisWidgets.delete(l))}if(!f(h))throw new Error("create yAxis failed.");h.setAutoCalcTickFlag(!0),h.override(r(r({},s),{name:u})),this.setAxisCursor(h.scrollZoomEnabled,l);var g=this.getBounding();return null===(a=this._yAxisWidgets.get(l))||void 0===a||a.setBounding({height:g.height,top:g.top}),h},e.prototype.getOptions=function(){return this._options},e.prototype.getYAxisComponents=function(){return Array.from(this._yAxisComponents.values())},e.prototype.getWidgetYAxisComponents=function(){var t=this;return Array.from(this._yAxisWidgets.keys()).map((function(e){return t._yAxisComponents.get(e)}))},e.prototype.hasYAxisComponent=function(t){return this._yAxisComponents.has(t)},e.prototype.setManualYAxis=function(t,e){e?this._manualYAxisIds.add(t):this._manualYAxisIds.delete(t)},e.prototype.isManualYAxis=function(t){return this._manualYAxisIds.has(t)},e.prototype.removeYAxis=function(t){var e,i=this;if(!f(this._yAxisComponents.get(t)))return!1;this._yAxisComponents.delete(t),this._manualYAxisIds.delete(t),this._defaultYAxisId===t&&(this._defaultYAxisId=null!==(e=this._yAxisComponents.keys().next().value)&&void 0!==e?e:null);var r=this._yAxisWidgets.get(t);return f(r)&&(r.destroy(),this._yAxisWidgets.delete(t)),this._yAxesBounding=Object.keys(this._yAxesBounding).reduce((function(e,r){return r!==t&&(e[r]=i._yAxesBounding[r]),e}),{}),!0},e.prototype.getDefaultYAxisId=function(){return this._defaultYAxisId},e.prototype.isDefaultYAxis=function(t){return this._defaultYAxisId===t},e.prototype.getYAxisComponentById=function(t){var e=null!=t?t:this.getDefaultYAxisId();return this._yAxisComponents.get(e)},e.prototype.getYAxisWidgetById=function(t){var e,i=null!=t?t:this.getDefaultYAxisId();return f(i)&&null!==(e=this._yAxisWidgets.get(i))&&void 0!==e?e:null},e.prototype.setYAxesBounding=function(t){this._yAxesBounding=t},e.prototype.setBounding=function(t,e,i,n){var o=this;c(this.getBounding(),t);var a={};f(t.height)&&(a.height=t.height),f(t.top)&&(a.top=t.top),this._mainWidget.setBounding(a);var s=f(e);return s&&this._mainWidget.setBounding(e),this._yAxisWidgets.size>0&&this._yAxisWidgets.forEach((function(t,l){var u,c,h,d;(t.setBounding(a),f(o._yAxesBounding[l]))?t.setBounding(o._yAxesBounding[l]):"left"===o.getYAxisComponentById(l).position?f(i)&&t.setBounding(r(r({},i),{left:0})):f(n)&&(t.setBounding(n),s&&t.setBounding({left:(null!==(u=e.left)&&void 0!==u?u:0)+(null!==(c=e.width)&&void 0!==c?c:0)+(null!==(h=e.right)&&void 0!==h?h:0)-(null!==(d=n.width)&&void 0!==d?d:0)}))})),this},e.prototype.getMainWidget=function(){return this._mainWidget},e.prototype.getYAxisWidget=function(){return this.getYAxisWidgetById()},e.prototype.getYAxisWidgets=function(){return Array.from(this._yAxisWidgets.values())},e.prototype.updateImp=function(t){this._mainWidget.update(t),this._yAxisWidgets.forEach((function(e){e.update(t)}))},e.prototype.destroy=function(){this._mainWidget.destroy(),this._yAxisWidgets.forEach((function(t){t.destroy()}))},e.prototype.getImage=function(t){var e=this.getBounding(),i=e.width,r=e.height,n=A("canvas",{width:"".concat(i,"px"),height:"".concat(r,"px"),boxSizing:"border-box"}),o=n.getContext("2d"),a=I(n);n.width=i*a,n.height=r*a,o.scale(a,a);var s=this._mainWidget.getBounding();return o.drawImage(this._mainWidget.getImage(t),s.left,0,s.width,s.height),this._yAxisWidgets.forEach((function(e){var i=e.getBounding();o.drawImage(e.getImage(t),i.left,0,i.width,i.height)})),n},e.prototype.createYAxisComponent=function(t){throw new Error("createYAxisComponent is not implemented.")},e.prototype.createYAxisWidget=function(t,e){return null},e}(ci),di=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.createYAxisComponent=function(t){var e=function(t){var e;return null!==(e=ii[t])&&void 0!==e?e:ii.normal}(null!=t?t:"default");return new e(this)},e.prototype.createMainWidget=function(t){return new $e(t,this)},e.prototype.createYAxisWidget=function(t,e){return new ui(t,this,e)},e}(hi),pi=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.createMainWidget=function(t){return new Je(t,this)},e}(di);var gi=function(t){function e(e,i){var r,n,o,a=t.call(this,e,i)||this;return a._dragFlag=!1,a._dragStartY=0,a._topPaneHeight=0,a._bottomPaneHeight=0,a._topPane=null,a._bottomPane=null,a._pressedMouseMoveEvent=(r=a._pressedTouchMouseMoveEvent,n=20,o=0,function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];var i=Date.now();i-o>n&&(r.apply(this,t),o=i)}),a.registerEvent("touchStartEvent",a._mouseDownEvent.bind(a)).registerEvent("touchMoveEvent",a._pressedMouseMoveEvent.bind(a)).registerEvent("touchEndEvent",a._mouseUpEvent.bind(a)).registerEvent("mouseDownEvent",a._mouseDownEvent.bind(a)).registerEvent("mouseUpEvent",a._mouseUpEvent.bind(a)).registerEvent("pressedMouseMoveEvent",a._pressedMouseMoveEvent.bind(a)).registerEvent("mouseEnterEvent",a._mouseEnterEvent.bind(a)).registerEvent("mouseLeaveEvent",a._mouseLeaveEvent.bind(a)),a}return i(e,t),e.prototype.getName=function(){return Et},e.prototype._dragEnabled=function(t,e){return"normal"===t.getOptions().state&&"normal"===e.getOptions().state&&e.getOptions().dragEnabled},e.prototype._findAdjustablePane=function(t,e){for(var i=this.getPane().getChart().getDrawPanes(),r=t;r>=0&&r<i.length;r+=e){var n=i[r];if(n.getId()!==K&&"normal"===n.getOptions().state)return n}return null},e.prototype._findDragPanes=function(){var t=this.getPane(),e=t.getChart().getDrawPanes(),i=e.indexOf(t.getTopPane()),r=e.indexOf(t.getBottomPane());if(-1===i||-1===r)return null;var n=this._findAdjustablePane(i,-1),o=this._findAdjustablePane(r,1);return f(n)&&f(o)&&this._dragEnabled(n,o)?{topPane:n,bottomPane:o}:null},e.prototype._mouseDownEvent=function(t){var e=this._findDragPanes();return f(e)?(this._topPane=e.topPane,this._bottomPane=e.bottomPane,this._dragFlag=!0,this._dragStartY=t.pageY,this._topPaneHeight=this._topPane.getBounding().height,this._bottomPaneHeight=this._bottomPane.getBounding().height,!0):(this._topPane=null,this._bottomPane=null,!1)},e.prototype._mouseUpEvent=function(){return this._dragFlag=!1,this._topPane=null,this._bottomPane=null,this._topPaneHeight=0,this._bottomPaneHeight=0,this._mouseLeaveEvent()},e.prototype._pressedTouchMouseMoveEvent=function(t){var e=t.pageY-this._dragStartY,i=e<0;if(f(this._topPane)&&f(this._bottomPane)&&this._dragEnabled(this._topPane,this._bottomPane)){var r=null,n=null,o=0,a=0;i?(r=this._topPane,n=this._bottomPane,o=this._topPaneHeight,a=this._bottomPaneHeight):(r=this._bottomPane,n=this._topPane,o=this._bottomPaneHeight,a=this._topPaneHeight);var s=r.getOptions().minHeight;if(o>s){var l=Math.max(o-Math.abs(e),s),u=o-l;r.setBounding({height:l});var c=a+u;n.setBounding({height:c}),r.setOptions({height:l}),n.setOptions({height:c});var h=this.getPane(),d=h.getChart();d.getChartStore().executeAction("onPaneDrag",{paneId:h.getId()}),d.layout({measureHeight:!0,measureWidth:!0,update:!0,buildYAxisTick:!0,forceBuildYAxisTick:!0})}}return!0},e.prototype._mouseEnterEvent=function(){if(f(this._findDragPanes())){var t=this.getPane().getChart().getStyles().separator;return this.getContainer().style.background=t.activeBackgroundColor,!0}return!1},e.prototype._mouseLeaveEvent=function(){return!this._dragFlag&&(this.getContainer().style.background="transparent",!0)},e.prototype.createContainer=function(){return A("div",{width:"100%",height:"".concat(7,"px"),margin:"0",padding:"0",position:"absolute",top:"-3px",zIndex:"20",boxSizing:"border-box",cursor:"ns-resize"})},e.prototype.updateImp=function(t,e,i){if(4===i||2===i){var r=this.getPane().getChart().getStyles().separator;t.style.top="".concat(-Math.floor((7-r.size)/2),"px"),t.style.height="".concat(7,"px")}},e}(Ke),vi=function(t){function e(e,i,r,n){var o=t.call(this,e,i)||this;return o.getContainer().style.overflow="",o._topPane=r,o._bottomPane=n,o._separatorWidget=new gi(o.getContainer(),o),o}return i(e,t),e.prototype.setBounding=function(t){return c(this.getBounding(),t),this},e.prototype.getTopPane=function(){return this._topPane},e.prototype.setTopPane=function(t){return this._topPane=t,this},e.prototype.getBottomPane=function(){return this._bottomPane},e.prototype.setBottomPane=function(t){return this._bottomPane=t,this},e.prototype.getWidget=function(){return this._separatorWidget},e.prototype.getImage=function(t){var e=this.getBounding(),i=e.width,r=e.height,n=this.getChart().getStyles().separator,o=A("canvas",{width:"".concat(i,"px"),height:"".concat(r,"px"),boxSizing:"border-box"}),a=o.getContext("2d"),s=I(o);return o.width=i*s,o.height=r*s,a.scale(s,s),a.fillStyle=n.color,a.fillRect(0,0,i,r),o},e.prototype.updateImp=function(t,e,i){if(4===t||2===t){var r=this.getChart().getStyles().separator;e.style.backgroundColor=r.color,e.style.height="".concat(i.height,"px"),e.style.marginLeft="".concat(i.left,"px"),e.style.width="".concat(i.width,"px"),this._separatorWidget.update(t)}},e}(ci),fi=function(t){function e(e,i){var r=t.call(this,e)||this;return r.override(i),r}return i(e,t),e.prototype.override=function(t){var e=t.name,i=t.scrollZoomEnabled,r=t.createTicks;!m(this.name)&&m(e)&&(this.name=e),this.scrollZoomEnabled=null!=i?i:this.scrollZoomEnabled,this.createTicks=null!=r?r:this.createTicks},e.prototype.createRangeImp=function(){var t=this.getParent().getChart().getChartStore().getVisibleRange(),e=t.realFrom,i=t.realTo,r=i-e+1;return{from:e,to:i,range:r,realFrom:e,realTo:i,realRange:r,displayFrom:e,displayTo:i,displayRange:r}},e.prototype.createTicksImp=function(){var t,e=this.getRange(),i=e.realFrom,r=e.realTo,n=e.from,o=this.getParent().getChart().getChartStore(),a=o.getInnerFormatter().formatDate,s=o.getPeriod(),l=[],u=o.getBarSpace().bar,c=o.getStyles().xAxis.tickText,h=Math.max(S("YYYY-MM-DD HH:mm:ss",c.size,c.weight,c.family),this.getBounding().width/8),d=Math.ceil(h/u);d%2!=0&&(d+=1);for(var g=Math.max(0,Math.floor(i/d)*d);g<r;g+=d)if(g>=n){var f=o.dataIndexToTimestamp(g);v(f)&&l.push({coord:this.convertToPixel(g),value:f,text:a(f,Fe[null!==(t=null==s?void 0:s.type)&&void 0!==t?t:"day"],"xAxis")})}return p(this.createTicks)?this.createTicks({range:this.getRange(),bounding:this.getBounding(),defaultTicks:l}):l},e.prototype.getAutoSize=function(){var t=this.getParent().getChart().getStyles(),e=t.xAxis,i=e.size;if("auto"!==i)return i;var r=t.crosshair,n=0;e.show&&(e.axisLine.show&&(n+=e.axisLine.size),e.tickLine.show&&(n+=e.tickLine.length),e.tickText.show&&(n+=e.tickText.marginStart+e.tickText.marginEnd+e.tickText.size));var o=0;return r.show&&r.vertical.show&&r.vertical.text.show&&(o+=r.vertical.text.paddingTop+r.vertical.text.paddingBottom+2*r.vertical.text.borderSize+r.vertical.text.size),Math.max(n,o)},e.prototype.getBounding=function(){return this.getParent().getMainWidget().getBounding()},e.prototype.convertTimestampFromPixel=function(t){var e=this.getParent().getChart().getChartStore(),i=e.coordinateToDataIndex(t);return e.dataIndexToTimestamp(i)},e.prototype.convertTimestampToPixel=function(t){var e=this.getParent().getChart().getChartStore(),i=e.timestampToDataIndex(t);return e.dataIndexToCoordinate(i)},e.prototype.convertFromPixel=function(t){return this.getParent().getChart().getChartStore().coordinateToDataIndex(t)},e.prototype.convertToPixel=function(t){return this.getParent().getChart().getChartStore().dataIndexToCoordinate(t)},e.extend=function(t){var r=function(e){function r(i){return e.call(this,i,t)||this}return i(r,e),r}(e);return r},e}(Q),yi={normal:fi.extend({name:"normal"})};var mi=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.compare=function(t){return f(t.timestamp)},e.prototype.getDirectionStyles=function(t){return t.vertical},e.prototype.getText=function(t,e){var i,r,n=t.timestamp;return e.getInnerFormatter().formatDate(n,Re[null!==(r=null===(i=e.getPeriod())||void 0===i?void 0:i.type)&&void 0!==r?r:"day"],"crosshair")},e.prototype.getTextAttrs=function(t,e,i,r,n,o){var a=i.realX,s=0,l="center";return a-e/2-o.paddingLeft<0?(s=0,l="left"):a+e/2+o.paddingRight>r.width?(s=r.width,l="right"):s=a,{x:s,y:0,text:t,align:l,baseline:"top"}},e}(ni),_i=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.coordinateToPointTimestampDataIndexFlag=function(){return!0},e.prototype.coordinateToPointValueFlag=function(){return!1},e.prototype.getCompleteOverlays=function(){return this.getWidget().getPane().getChart().getChartStore().getOverlaysByPaneId()},e.prototype.getProgressOverlay=function(){var t,e;return null!==(e=null===(t=this.getWidget().getPane().getChart().getChartStore().getProgressOverlayInfo())||void 0===t?void 0:t.overlay)&&void 0!==e?e:null},e.prototype.getDefaultFigures=function(t,e){var i,r=[],n=this.getWidget(),o=n.getPane().getChart().getChartStore(),a=o.getClickOverlayInfo();if(t.needDefaultXAxisFigure&&t.id===(null===(i=a.overlay)||void 0===i?void 0:i.id)){var s=Number.MAX_SAFE_INTEGER,l=Number.MIN_SAFE_INTEGER;e.forEach((function(e,i){s=Math.min(s,e.x),l=Math.max(l,e.x);var n=t.points[i];if(v(n.timestamp)){var a=o.getInnerFormatter().formatDate(n.timestamp,"YYYY-MM-DD HH:mm","crosshair");r.push({type:"text",attrs:{x:e.x,y:0,text:a,align:"center"},ignoreEvent:!0})}})),e.length>1&&r.unshift({type:"rect",attrs:{x:s,y:0,width:l-s,height:n.getBounding().height},ignoreEvent:!0})}return r},e.prototype.getFigures=function(t,e){var i,r,n=this.getWidget(),o=n.getPane(),a=o.getChart(),s=o.getYAxisComponentById(),l=a.getXAxisPane().getXAxisComponent(),u=n.getBounding();return null!==(r=null===(i=t.createXAxisFigures)||void 0===i?void 0:i.call(t,{chart:a,overlay:t,coordinates:e,bounding:u,xAxis:l,yAxis:s}))&&void 0!==r?r:[]},e}(ai),xi=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return i(e,t),e.prototype.getAxis=function(){return this.getWidget().getPane().getXAxisComponent()},e.prototype.getAxisStyles=function(t){return t.xAxis},e.prototype.createAxisLine=function(t){return{coordinates:[{x:0,y:0},{x:t.width,y:0}]}},e.prototype.createTickLines=function(t,e,i){var r=i.tickLine,n=i.axisLine.size;return t.map((function(t){return{coordinates:[{x:t.coord,y:0},{x:t.coord,y:n+r.length}]}}))},e.prototype.createTickTexts=function(t,e,i){var r=i.tickText,n=i.axisLine.size,o=i.tickLine.length;return t.map((function(t){return{x:t.coord,y:n+o+r.marginStart,text:t.text,align:"center",baseline:"top"}}))},e}(si),bi=function(t){function e(e,i){var r=t.call(this,e,i)||this;return r._xAxisView=new xi(r),r._overlayXAxisView=new _i(r),r._crosshairVerticalLabelView=new mi(r),r.setCursor("ew-resize"),r.addChild(r._overlayXAxisView),r}return i(e,t),e.prototype.getName=function(){return wt},e.prototype.updateMain=function(t){this._xAxisView.draw(t)},e.prototype.updateOverlay=function(t){this._overlayXAxisView.draw(t),this._crosshairVerticalLabelView.draw(t)},e}(Qe),wi=function(t){function e(e,i){var r=t.call(this,e,i)||this;return r.overrideXAxis({name:"normal",scrollZoomEnabled:!0}),r}return i(e,t),e.prototype.setOptions=function(e){return t.prototype.setOptions.call(this,e)},e.prototype.overrideXAxis=function(t){var e=t.name;return(!f(this._xAxis)||f(e)&&this._xAxis.name!==e)&&(this._xAxis=this.createXAxisComponent(null!=e?e:"normal")),this._xAxis.override(t),this.setAxisCursor(this._xAxis.scrollZoomEnabled),this},e.prototype.getXAxisComponent=function(){return this._xAxis},e.prototype.createXAxisComponent=function(t){var e=function(t){var e;return null!==(e=yi[t])&&void 0!==e?e:yi.normal}(t);return new e(this)},e.prototype.createMainWidget=function(t){return new bi(t,this)},e}(hi),Ci=function(){function t(){this._callbacks=[]}return t.prototype.subscribe=function(t){this._callbacks.indexOf(t)<0&&this._callbacks.push(t)},t.prototype.unsubscribe=function(t){if(p(t)){var e=this._callbacks.indexOf(t);e>-1&&this._callbacks.splice(e,1)}else this._callbacks=[]},t.prototype.execute=function(t){this._callbacks.forEach((function(e){e(t)}))},t.prototype.isEmpty=function(){return 0===this._callbacks.length},t}(),Ei={RED:"#F92855",GREEN:"#2DC08E",WHITE:"#FFFFFF",GREY:"#76808F",BLUE:"#1677FF"};function Ii(){return{show:!0,size:"auto",axisLine:{show:!0,color:"#DDDDDD",size:1},tickText:{show:!0,color:Ei.GREY,size:12,family:"Helvetica Neue",weight:"normal",marginStart:4,marginEnd:6},tickLine:{show:!0,size:1,length:3,color:"#DDDDDD"}}}var Ti=function(){function t(t){this._holdingTasks=null,this._running=!1,this._callback=t}return t.prototype.add=function(t){this._running?f(this._holdingTasks)?this._holdingTasks=r(r({},this._holdingTasks),t):this._holdingTasks=t:this._runTask(t)},t.prototype._runTask=function(t){return o(this,void 0,void 0,(function(){var e,i;return a(this,(function(r){switch(r.label){case 0:this._running=!0,r.label=1;case 1:return r.trys.push([1,,3,4]),[4,Promise.all(Object.values(t))];case 2:return r.sent(),[3,4];case 3:return this._running=!1,null===(i=this._callback)||void 0===i||i.call(this),f(this._holdingTasks)&&(e=this._holdingTasks,this._runTask(e),this._holdingTasks=null),[7];case 4:return[2]}}))}))},t.prototype.clear=function(){this._holdingTasks=null},t}();var Si={name:"fibonacciLine",totalStep:3,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){var e,i,r,n=t.chart,o=t.coordinates,a=t.bounding,s=t.overlay,l=t.yAxis,u=s.points;if(o.length>0){var c=0;if(null===(e=null==l?void 0:l.isInCandle())||void 0===e||e)c=null!==(r=null===(i=n.getSymbol())||void 0===i?void 0:i.pricePrecision)&&void 0!==r?r:O;else n.getIndicators({paneId:s.paneId}).forEach((function(t){c=Math.max(c,t.precision)}));var h=[],d=[],p=a.width;if(o.length>1&&v(u[0].value)&&v(u[1].value)){var g=o[0].y-o[1].y,f=u[0].value-u[1].value;[1,.786,.618,.5,.382,.236,0].forEach((function(t){var e,i=o[1].y+g*t,r=n.getDecimalFold().format(n.getThousandsSeparator().format(((null!==(e=u[1].value)&&void 0!==e?e:0)+f*t).toFixed(c)));h.push({coordinates:[{x:0,y:i},{x:p,y:i}]}),d.push({x:0,y:i,text:"".concat(r," (").concat((100*t).toFixed(1),"%)"),baseline:"bottom"})}))}return[{type:"line",attrs:h},{type:"text",isCheckEvent:!1,attrs:d}]}return[]}},Ai={name:"horizontalRayLine",totalStep:3,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){var e=t.coordinates,i=t.bounding,r={x:0,y:e[0].y};return f(e[1])&&e[0].x<e[1].x&&(r.x=i.width),[{type:"line",attrs:{coordinates:[e[0],r]}}]},performEventPressedMove:function(t){var e=t.points,i=t.performPoint;e[0].value=i.value,e[1].value=i.value},performEventMoveForDrawing:function(t){var e=t.currentStep,i=t.points,r=t.performPoint;2===e&&(i[0].value=r.value)}};function Mi(t,e,i){var r=null!=i?i:0,n=[];if(t.length>1)if(t[0].x===t[1].x){var o=e.height;if(n.push({coordinates:[{x:t[0].x,y:0},{x:t[0].x,y:o}]}),t.length>2){n.push({coordinates:[{x:t[2].x,y:0},{x:t[2].x,y:o}]});for(var a=t[0].x-t[2].x,s=0;s<r;s++){var l=a*(s+1);n.push({coordinates:[{x:t[0].x+l,y:0},{x:t[0].x+l,y:o}]})}}}else{var u=e.width,c=ee(t[0],t[1]),h=c[0],d=c[1];if(n.push({coordinates:[{x:0,y:0*h+d},{x:u,y:u*h+d}]}),t.length>2){var p=t[2].y-h*t[2].x;n.push({coordinates:[{x:0,y:0*h+p},{x:u,y:u*h+p}]});for(a=d-p,s=0;s<r;s++){var g=d+a*(s+1);n.push({coordinates:[{x:0,y:0*h+g},{x:u,y:u*h+g}]})}}}return n}var Pi={name:"parallelStraightLine",totalStep:4,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){return[{type:"line",attrs:Mi(t.coordinates,t.bounding)}]}},Di={name:"priceChannelLine",totalStep:4,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){return[{type:"line",attrs:Mi(t.coordinates,t.bounding,1)}]}},ki={name:"priceLine",totalStep:2,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){var e,i,r,n=t.chart,o=t.coordinates,a=t.bounding,s=t.overlay,l=t.yAxis,u=0;null===(e=null==l?void 0:l.isInCandle())||void 0===e||e?u=null!==(r=null===(i=n.getSymbol())||void 0===i?void 0:i.pricePrecision)&&void 0!==r?r:O:n.getIndicators({paneId:s.paneId}).forEach((function(t){u=Math.max(u,t.precision)}));var c=s.points[0].value,h=void 0===c?0:c;return[{type:"line",attrs:{coordinates:[o[0],{x:a.width,y:o[0].y}]}},{type:"text",ignoreEvent:!0,attrs:{x:o[0].x,y:o[0].y,text:n.getDecimalFold().format(n.getThousandsSeparator().format(h.toFixed(u))),baseline:"bottom"}}]}};function Bi(t,e){if(t.length>1){var i={x:0,y:0};return i=t[0].x===t[1].x&&t[0].y!==t[1].y?t[0].y<t[1].y?{x:t[0].x,y:e.height}:{x:t[0].x,y:0}:t[0].x>t[1].x?{x:0,y:te(t[0],t[1],{x:0,y:t[0].y})}:{x:e.width,y:te(t[0],t[1],{x:e.width,y:t[0].y})},{coordinates:[t[0],i]}}return[]}var Fi={name:"rayLine",totalStep:3,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){return[{type:"line",attrs:Bi(t.coordinates,t.bounding)}]}},Ri={name:"simpleAnnotation",totalStep:2,styles:{line:{style:"dashed"}},createPointFigures:function(t){var e,i=t.overlay,r=t.coordinates,n="";f(i.extendData)&&(n=p(i.extendData)?i.extendData(i):null!==(e=i.extendData)&&void 0!==e?e:"");var o=r[0].x,a=r[0].y-6,s=a-50,l=s-5;return[{type:"line",attrs:{coordinates:[{x:o,y:a},{x:o,y:s}]},ignoreEvent:!0},{type:"polygon",attrs:{coordinates:[{x:o,y:s},{x:o-4,y:l},{x:o+4,y:l}]},ignoreEvent:!0},{type:"text",attrs:{x:o,y:l,text:n,align:"center",baseline:"bottom"},ignoreEvent:!0}]}},Li={name:"simpleTag",totalStep:2,styles:{line:{style:"dashed"}},createPointFigures:function(t){var e=t.bounding,i=t.coordinates;return{type:"line",attrs:{coordinates:[{x:0,y:i[0].y},{x:e.width,y:i[0].y}]},ignoreEvent:!0}},createYAxisFigures:function(t){var e,i,r,n,o=t.chart,a=t.overlay,s=t.coordinates,l=t.bounding,u=t.yAxis,c="left",h=0;null!==(e=null==u?void 0:u.isFromZero())&&void 0!==e&&e?(c="left",h=0):(c="right",h=l.width);var d="";return f(a.extendData)&&(d=p(a.extendData)?a.extendData(a):null!==(i=a.extendData)&&void 0!==i?i:""),!f(d)&&v(a.points[0].value)&&(d=H(a.points[0].value,null!==(n=null===(r=o.getSymbol())||void 0===r?void 0:r.pricePrecision)&&void 0!==n?n:O)),{type:"text",attrs:{x:h,y:s[0].y,text:d,align:c,baseline:"middle"}}}},Oi={name:"straightLine",totalStep:3,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){var e=t.coordinates,i=t.bounding;return 2===e.length?e[0].x===e[1].x?[{type:"line",attrs:{coordinates:[{x:e[0].x,y:0},{x:e[0].x,y:i.height}]}}]:[{type:"line",attrs:{coordinates:[{x:0,y:te(e[0],e[1],{x:0,y:e[0].y})},{x:i.width,y:te(e[0],e[1],{x:i.width,y:e[0].y})}]}}]:[]}},Yi={},Wi=[Si,Ai,{name:"horizontalSegment",totalStep:3,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){var e=t.coordinates,i=[];return 2===e.length&&i.push({coordinates:e}),[{type:"line",attrs:i}]},performEventPressedMove:function(t){var e=t.points,i=t.performPoint;e[0].value=i.value,e[1].value=i.value},performEventMoveForDrawing:function(t){var e=t.currentStep,i=t.points,r=t.performPoint;2===e&&(i[0].value=r.value)}},{name:"horizontalStraightLine",totalStep:2,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){var e=t.coordinates,i=t.bounding;return[{type:"line",attrs:{coordinates:[{x:0,y:e[0].y},{x:i.width,y:e[0].y}]}}]}},Pi,Di,ki,Fi,{name:"segment",totalStep:3,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){var e=t.coordinates;return 2===e.length?[{type:"line",attrs:{coordinates:e}}]:[]}},Oi,{name:"verticalRayLine",totalStep:3,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){var e=t.coordinates,i=t.bounding;if(2===e.length){var r={x:e[0].x,y:0};return e[0].y<e[1].y&&(r.y=i.height),[{type:"line",attrs:{coordinates:[e[0],r]}}]}return[]},performEventPressedMove:function(t){var e=t.points,i=t.performPoint;e[0].timestamp=i.timestamp,e[0].dataIndex=i.dataIndex,e[1].timestamp=i.timestamp,e[1].dataIndex=i.dataIndex},performEventMoveForDrawing:function(t){var e=t.currentStep,i=t.points,r=t.performPoint;2===e&&(i[0].timestamp=r.timestamp,i[0].dataIndex=r.dataIndex)}},{name:"verticalSegment",totalStep:3,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){var e=t.coordinates;return 2===e.length?[{type:"line",attrs:{coordinates:e}}]:[]},performEventPressedMove:function(t){var e=t.points,i=t.performPoint;e[0].timestamp=i.timestamp,e[0].dataIndex=i.dataIndex,e[1].timestamp=i.timestamp,e[1].dataIndex=i.dataIndex},performEventMoveForDrawing:function(t){var e=t.currentStep,i=t.points,r=t.performPoint;2===e&&(i[0].timestamp=r.timestamp,i[0].dataIndex=r.dataIndex)}},{name:"verticalStraightLine",totalStep:2,needDefaultPointFigure:!0,needDefaultXAxisFigure:!0,needDefaultYAxisFigure:!0,createPointFigures:function(t){var e=t.coordinates,i=t.bounding;return[{type:"line",attrs:{coordinates:[{x:e[0].x,y:0},{x:e[0].x,y:i.height}]}}]}},Ri,Li,{name:"brush",totalStep:2,drawingMode:"continuous",needDefaultPointFigure:!1,needDefaultXAxisFigure:!1,needDefaultYAxisFigure:!1,createPointFigures:function(t){var e=t.coordinates;return e.length<2?[]:[{type:"line",attrs:{coordinates:e},styles:{smooth:!1,lineCap:"round",lineJoin:"round"}}]}}];function zi(t){var e;return null!==(e=Yi[t])&&void 0!==e?e:null}Wi.forEach((function(t){Yi[t.name]=Ge.extend(t)}));var Vi={light:{grid:{horizontal:{color:"#EDEDED"},vertical:{color:"#EDEDED"}},candle:{priceMark:{high:{color:"#76808F"},low:{color:"#76808F"}},tooltip:{rect:{color:"#FEFEFE",borderColor:"#F2F3F5"},title:{color:"#76808F"},legend:{color:"#76808F"}}},indicator:{tooltip:{title:{color:"#76808F"},legend:{color:"#76808F"}}},xAxis:{axisLine:{color:"#DDDDDD"},tickText:{color:"#76808F"},tickLine:{color:"#DDDDDD"}},yAxis:{axisLine:{color:"#DDDDDD"},tickText:{color:"#76808F"},tickLine:{color:"#DDDDDD"}},separator:{color:"#DDDDDD"},crosshair:{horizontal:{line:{color:"#76808F"},text:{borderColor:"#686D76",backgroundColor:"#686D76"}},vertical:{line:{color:"#76808F"},text:{borderColor:"#686D76",backgroundColor:"#686D76"}}}},dark:{grid:{horizontal:{color:"#292929"},vertical:{color:"#292929"}},candle:{priceMark:{high:{color:"#929AA5"},low:{color:"#929AA5"}},tooltip:{rect:{color:"rgba(10, 10, 10, .6)",borderColor:"rgba(10, 10, 10, .6)"},title:{color:"#929AA5"},legend:{color:"#929AA5"}}},indicator:{tooltip:{title:{color:"#929AA5"},legend:{color:"#929AA5"}}},xAxis:{axisLine:{color:"#333333"},tickText:{color:"#929AA5"},tickLine:{color:"#333333"}},yAxis:{axisLine:{color:"#333333"},tickText:{color:"#929AA5"},tickLine:{color:"#333333"}},separator:{color:"#333333"},crosshair:{horizontal:{line:{color:"#929AA5"},text:{borderColor:"#373a40",backgroundColor:"#373a40"}},vertical:{line:{color:"#929AA5"},text:{borderColor:"#373a40",backgroundColor:"#373a40"}}}}};function Ni(t){var e;return null!==(e=Vi[t])&&void 0!==e?e:null}var Hi=function(){function t(t,e){var i,n,o,a,s,l=this;this._styles={grid:{show:!0,horizontal:{show:!0,size:1,color:"#EDEDED",style:"dashed",dashedValue:[2,2]},vertical:{show:!0,size:1,color:"#EDEDED",style:"dashed",dashedValue:[2,2]}},candle:(s={show:!0,color:Ei.GREY,textOffset:5,textSize:10,textFamily:"Helvetica Neue",textWeight:"normal"},{type:"candle_solid",bar:{compareRule:"current_open",upColor:Ei.GREEN,downColor:Ei.RED,noChangeColor:Ei.GREY,upBorderColor:Ei.GREEN,downBorderColor:Ei.RED,noChangeBorderColor:Ei.GREY,upWickColor:Ei.GREEN,downWickColor:Ei.RED,noChangeWickColor:Ei.GREY},area:{lineSize:2,lineColor:Ei.BLUE,smooth:!1,value:"close",backgroundColor:[{offset:0,color:se(Ei.BLUE,.01)},{offset:1,color:se(Ei.BLUE,.2)}],point:{show:!0,color:Ei.BLUE,radius:4,rippleColor:se(Ei.BLUE,.3),rippleRadius:8,animation:!0,animationDuration:1e3}},priceMark:{show:!0,high:r({},s),low:r({},s),last:{show:!0,compareRule:"current_open",upColor:Ei.GREEN,downColor:Ei.RED,noChangeColor:Ei.GREY,line:{show:!0,style:"dashed",dashedValue:[4,4],size:1},text:{show:!0,style:"fill",size:12,paddingLeft:4,paddingTop:4,paddingRight:4,paddingBottom:4,borderColor:"transparent",borderStyle:"solid",borderSize:0,borderDashedValue:[2,2],color:Ei.WHITE,family:"Helvetica Neue",weight:"normal",borderRadius:2},extendTexts:[]}},tooltip:{offsetLeft:4,offsetTop:6,offsetRight:4,offsetBottom:6,showRule:"always",showType:"standard",rect:{position:"fixed",paddingLeft:4,paddingRight:4,paddingTop:4,paddingBottom:4,offsetLeft:4,offsetTop:4,offsetRight:4,offsetBottom:4,borderRadius:4,borderSize:1,borderColor:"#F2F3F5",color:"#FEFEFE"},title:{show:!0,size:14,family:"Helvetica Neue",weight:"normal",color:Ei.GREY,marginLeft:8,marginTop:4,marginRight:8,marginBottom:4,template:"{ticker} · {period}"},legend:{size:12,family:"Helvetica Neue",weight:"normal",color:Ei.GREY,marginLeft:8,marginTop:4,marginRight:8,marginBottom:4,defaultValue:"n/a",template:[{title:"time",value:"{time}"},{title:"open",value:"{open}"},{title:"high",value:"{high}"},{title:"low",value:"{low}"},{title:"close",value:"{close}"},{title:"volume",value:"{volume}"}]},features:[]}}),indicator:(o=se(Ei.GREEN,.7),a=se(Ei.RED,.7),{ohlc:{compareRule:"current_open",upColor:o,downColor:a,noChangeColor:Ei.GREY},bars:[{style:"fill",borderStyle:"solid",borderSize:1,borderDashedValue:[2,2],upColor:o,downColor:a,noChangeColor:Ei.GREY}],lines:["#FF9600","#935EBD",Ei.BLUE,"#E11D74","#01C5C4"].map((function(t){return{style:"solid",smooth:!1,size:1,dashedValue:[2,2],color:t}})),circles:[{style:"fill",borderStyle:"solid",borderSize:1,borderDashedValue:[2,2],upColor:o,downColor:a,noChangeColor:Ei.GREY}],texts:[{paddingLeft:0,paddingTop:0,paddingRight:0,paddingBottom:0,style:"fill",size:12,color:Ei.BLUE,family:"Helvetica Neue",weight:"normal",borderStyle:"solid",borderDashedValue:[2,2],borderSize:0,borderColor:"transparent",borderRadius:0,backgroundColor:"transparent"}],lastValueMark:{show:!1,text:{show:!1,style:"fill",color:Ei.WHITE,size:12,family:"Helvetica Neue",weight:"normal",borderStyle:"solid",borderColor:"transparent",borderSize:0,borderDashedValue:[2,2],paddingLeft:4,paddingTop:4,paddingRight:4,paddingBottom:4,borderRadius:2}},tooltip:{offsetLeft:4,offsetTop:6,offsetRight:4,offsetBottom:6,showRule:"always",showType:"standard",title:{show:!0,showName:!0,showParams:!0,size:12,family:"Helvetica Neue",weight:"normal",color:Ei.GREY,marginLeft:8,marginTop:4,marginRight:8,marginBottom:4},legend:{size:12,family:"Helvetica Neue",weight:"normal",color:Ei.GREY,marginLeft:8,marginTop:4,marginRight:8,marginBottom:4,defaultValue:"n/a"},features:[]}}),xAxis:Ii(),yAxis:Ii(),separator:{size:1,color:"#DDDDDD",fill:!0,activeBackgroundColor:se(Ei.BLUE,.08)},crosshair:{show:!0,horizontal:{show:!0,line:{show:!0,style:"dashed",dashedValue:[4,2],size:1,color:Ei.GREY},text:{show:!0,style:"fill",color:Ei.WHITE,size:12,family:"Helvetica Neue",weight:"normal",borderStyle:"solid",borderDashedValue:[2,2],borderSize:1,borderColor:Ei.GREY,borderRadius:2,paddingLeft:4,paddingRight:4,paddingTop:4,paddingBottom:4,backgroundColor:Ei.GREY},features:[]},vertical:{show:!0,line:{show:!0,style:"dashed",dashedValue:[4,2],size:1,color:Ei.GREY},text:{show:!0,style:"fill",color:Ei.WHITE,size:12,family:"Helvetica Neue",weight:"normal",borderStyle:"solid",borderDashedValue:[2,2],borderSize:1,borderColor:Ei.GREY,borderRadius:2,paddingLeft:4,paddingRight:4,paddingTop:4,paddingBottom:4,backgroundColor:Ei.GREY}}},overlay:(i=se(Ei.BLUE,.35),n=se(Ei.BLUE,.25),{point:{color:Ei.BLUE,borderColor:i,borderSize:1,radius:5,activeColor:Ei.BLUE,activeBorderColor:i,activeBorderSize:3,activeRadius:5},line:{style:"solid",smooth:!1,color:Ei.BLUE,size:1,dashedValue:[2,2]},rect:{style:"fill",color:n,borderColor:Ei.BLUE,borderSize:1,borderRadius:0,borderStyle:"solid",borderDashedValue:[2,2]},polygon:{style:"fill",color:Ei.BLUE,borderColor:Ei.BLUE,borderSize:1,borderStyle:"solid",borderDashedValue:[2,2]},circle:{style:"fill",color:n,borderColor:Ei.BLUE,borderSize:1,borderStyle:"solid",borderDashedValue:[2,2]},arc:{style:"solid",color:Ei.BLUE,size:1,dashedValue:[2,2]},text:{style:"fill",color:Ei.WHITE,size:12,family:"Helvetica Neue",weight:"normal",borderStyle:"solid",borderDashedValue:[2,2],borderSize:1,borderRadius:2,borderColor:Ei.BLUE,paddingLeft:4,paddingRight:4,paddingTop:4,paddingBottom:4,backgroundColor:Ei.BLUE}})},this._formatter={formatDate:function(t){return N(t.dateTimeFormat,t.timestamp,t.template)},formatBigNumber:X,formatExtendText:function(t){return""}},this._innerFormatter={formatDate:function(t,e,i){return l._formatter.formatDate({dateTimeFormat:l._dateTimeFormat,timestamp:t,template:e,type:i})},formatBigNumber:function(t){return l._formatter.formatBigNumber(t)},formatExtendText:function(t){return l._formatter.formatExtendText(t)}},this._locale="en-US",this._thousandsSeparator={sign:",",format:function(t){return U(t,l._thousandsSeparator.sign)}},this._decimalFold={threshold:3,format:function(t){return G(t,l._decimalFold.threshold)}},this._hotKey={enabled:!0,exclude:[]},this._symbol=null,this._period=null,this._dataList=[],this._dataLoader=null,this._loading=!1,this._dataLoadMore={forward:!1,backward:!1},this._zoomEnabled=!0,this._zoomAnchor={main:"cursor",xAxis:"cursor"},this._scrollEnabled=!0,this._totalBarSpace=0,this._barSpace=10,this._offsetRightDistance=80,this._startLastBarRightSideDiffBarCount=0,this._scrollLimitRole="bar_count",this._minVisibleBarCount={left:2,right:2},this._maxOffsetDistance={left:50,right:50},this._visibleRange={from:0,to:0,realFrom:0,realTo:0},this._visibleRangeDataList=[],this._visibleRangeHighLowPrice=[{x:0,price:Number.MIN_SAFE_INTEGER},{x:0,price:Number.MAX_SAFE_INTEGER}],this._crosshair={},this._actions=new Map,this._indicators=new Map,this._overlays=new Map,this._progressOverlayInfo=null,this._lastPriceMarkExtendTextUpdateTimers=[],this._pressedOverlayInfo={paneId:"",overlay:null,figureType:"none",figureIndex:-1,figure:null},this._hoverOverlayInfo={paneId:"",overlay:null,figureType:"none",figureIndex:-1,figure:null},this._clickOverlayInfo={paneId:"",overlay:null,figureType:"none",figureIndex:-1,figure:null},this._layoutOptions={barSpaceLimit:{min:1,max:50},pane:{minHeight:30,dragEnabled:!0,order:0,height:100,state:"normal"},yAxis:{reverse:!1,inside:!1,position:"right",scrollZoomEnabled:!0,needWidget:!0,gap:{top:.2,bottom:.1}}},this._chart=t;var u=null!=e?e:{},h=u.styles,d=u.locale,p=u.timezone,g=u.formatter,v=u.thousandsSeparator,y=u.decimalFold,_=u.zoomAnchor,x=u.hotkey,b=u.layout;f(b)&&c(this._layoutOptions,b),this._calcOptimalBarSpace(),this._lastBarRightSideDiffBarCount=this._offsetRightDistance/this._barSpace,f(h)&&this.setStyles(h),m(d)&&this.setLocale(d),this.setTimezone(null!=p?p:""),f(g)&&this.setFormatter(g),f(v)&&this.setThousandsSeparator(v),f(y)&&this.setDecimalFold(y),f(_)&&this.setZoomAnchor(_),f(x)&&this.setHotkey(x),this._taskScheduler=new Ti((function(){l._chart.layout({measureWidth:!0,update:!0,buildYAxisTick:!0})}))}return t.prototype.setStyles=function(t){var e,i,r,n,o,a,s=this,l=null;if(l=m(t)?Ni(t):t,c(this._styles,l),d(null===(r=null===(i=null===(e=null==l?void 0:l.candle)||void 0===e?void 0:e.tooltip)||void 0===i?void 0:i.legend)||void 0===r?void 0:r.template)&&(this._styles.candle.tooltip.legend.template=l.candle.tooltip.legend.template),f(null===(a=null===(o=null===(n=null==l?void 0:l.candle)||void 0===n?void 0:n.priceMark)||void 0===o?void 0:o.last)||void 0===a?void 0:a.extendTexts)){this._clearLastPriceMarkExtendTextUpdateTimer();var u=[];this._styles.candle.priceMark.last.extendTexts.forEach((function(t){var e=t.updateInterval;if(t.show&&e>0&&!u.includes(e)){u.push(e);var i=setInterval((function(){s._chart.updatePane(0,j)}),e);s._lastPriceMarkExtendTextUpdateTimers.push(i)}}))}},t.prototype.getStyles=function(){return this._styles},t.prototype.setFormatter=function(t){c(this._formatter,t)},t.prototype.getFormatter=function(){return this._formatter},t.prototype.getInnerFormatter=function(){return this._innerFormatter},t.prototype.setLocale=function(t){this._locale=t},t.prototype.getLocale=function(){return this._locale},t.prototype.setTimezone=function(t){if(!f(this._dateTimeFormat)||this.getTimezone()!==t){var e={hour12:!1,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"};t.length>0&&(e.timeZone=t);var i=null;try{i=new Intl.DateTimeFormat("en",e)}catch(t){}null!==i&&(this._dateTimeFormat=i)}},t.prototype.getTimezone=function(){return this._dateTimeFormat.resolvedOptions().timeZone},t.prototype.getDateTimeFormat=function(){return this._dateTimeFormat},t.prototype.setThousandsSeparator=function(t){c(this._thousandsSeparator,t)},t.prototype.getThousandsSeparator=function(){return this._thousandsSeparator},t.prototype.setDecimalFold=function(t){c(this._decimalFold,t)},t.prototype.getDecimalFold=function(){return this._decimalFold},t.prototype.setHotkey=function(t){c(this._hotKey,t)},t.prototype.getHotkey=function(){return this._hotKey},t.prototype.getHotKey=function(){return this._hotKey},t.prototype.setSymbol=function(t){var e=this;this.resetData((function(){e._symbol=r(r({pricePrecision:O,volumePrecision:Y},e._symbol),t),e._synchronizeIndicatorSeriesPrecision()}))},t.prototype.getSymbol=function(){return this._symbol},t.prototype.setPeriod=function(t){var e=this;this.resetData((function(){e._period=t}))},t.prototype.getPeriod=function(){return this._period},t.prototype.getDataList=function(){return this._dataList},t.prototype.getVisibleRangeDataList=function(){return this._visibleRangeDataList},t.prototype.getVisibleRangeHighLowPrice=function(){return this._visibleRangeHighLowPrice},t.prototype._addData=function(t,e,i){var r,n,o=!1,a=!1;if(d(t)){var s={backward:!1,forward:!1};switch(y(i)?(s.backward=i,s.forward=i):(s.backward=null!==(r=null==i?void 0:i.backward)&&void 0!==r&&r,s.forward=null!==(n=null==i?void 0:i.forward)&&void 0!==n&&n),e){case"init":this._clearData(),this._dataList=t,this._dataLoadMore.backward=s.backward,this._dataLoadMore.forward=s.forward,this.setOffsetRightDistance(this._offsetRightDistance),a=!0;break;case"backward":this._dataList=this._dataList.concat(t),this._dataLoadMore.backward=s.backward,this._lastBarRightSideDiffBarCount-=t.length,this._startLastBarRightSideDiffBarCount-=t.length,a=t.length>0;break;case"forward":this._dataList=t.concat(this._dataList),this._dataLoadMore.forward=s.forward,a=t.length>0}o=!0}else{var l=this._dataList.length,u=t.timestamp,c=V(this._dataList[l-1],"timestamp",0);if(u>c){this._dataList.push(t);var h=this.getLastBarRightSideDiffBarCount();h<0&&this.setLastBarRightSideDiffBarCount(--h),o=!0,a=!0}else u===c&&(this._dataList[l-1]=t,o=!0,a=!0)}if(o&&a){this._adjustVisibleRange(),this.setCrosshair(this._crosshair,{notInvalidate:!0});var p=this.getIndicatorsByFilter({});p.length>0?this._calcIndicator(p):this._chart.layout({measureWidth:!0,update:!0,buildYAxisTick:!0,cacheYAxisWidth:"init"!==e})}},t.prototype.setDataLoader=function(t){var e=this;this.resetData((function(){e._dataLoader=t}))},t.prototype._calcOptimalBarSpace=function(){var t=1-.2*Math.atan(Math.max(4,this._barSpace)-4)/(.5*Math.PI),e=Math.min(Math.floor(this._barSpace*t),Math.floor(this._barSpace));e%2==0&&e+2>=this._barSpace&&--e,this._gapBarSpace=Math.max(1,e)},t.prototype._adjustVisibleRange=function(){var t,e,i=this._dataList.length,r=this._totalBarSpace/this._barSpace,n=0,o=0;"distance"===this._scrollLimitRole?(n=(this._totalBarSpace-this._maxOffsetDistance.right)/this._barSpace,o=(this._totalBarSpace-this._maxOffsetDistance.left)/this._barSpace):(n=this._minVisibleBarCount.left,o=this._minVisibleBarCount.right),n=Math.max(0,n),o=Math.max(0,o);var a=r-Math.min(n,i);this._lastBarRightSideDiffBarCount>a&&(this._lastBarRightSideDiffBarCount=a);var s=-i+Math.min(o,i);this._lastBarRightSideDiffBarCount<s&&(this._lastBarRightSideDiffBarCount=s);var l=Math.round(this._lastBarRightSideDiffBarCount+i+.5),u=l;l>i&&(l=i);var c=Math.round(l-r)-1;c<0&&(c=0);var h=this._lastBarRightSideDiffBarCount>0?Math.round(i+this._lastBarRightSideDiffBarCount-r)-1:c;this._visibleRange={from:c,to:l,realFrom:h,realTo:u},this.executeAction("onVisibleRangeChange",this._visibleRange),this._visibleRangeDataList=[],this._visibleRangeHighLowPrice=[{x:0,price:Number.MIN_SAFE_INTEGER},{x:0,price:Number.MAX_SAFE_INTEGER}];for(var d=h;d<u;d++){var p=this._dataList[d],g=this.dataIndexToCoordinate(d);this._visibleRangeDataList.push({dataIndex:d,x:g,data:{prev:null!==(t=this._dataList[d-1])&&void 0!==t?t:p,current:p,next:null!==(e=this._dataList[d+1])&&void 0!==e?e:p}}),f(p)&&(this._visibleRangeHighLowPrice[0].price<p.high&&(this._visibleRangeHighLowPrice[0].price=p.high,this._visibleRangeHighLowPrice[0].x=g),this._visibleRangeHighLowPrice[1].price>p.low&&(this._visibleRangeHighLowPrice[1].price=p.low,this._visibleRangeHighLowPrice[1].x=g))}0===c?this._dataLoadMore.forward&&this._processDataLoad("forward"):l===i&&this._dataLoadMore.backward&&this._processDataLoad("backward")},t.prototype._processDataLoad=function(t){var e,i,r,n,o=this;if(!this._loading&&f(this._dataLoader)&&f(this._symbol)&&f(this._period)){this._loading=!0;var a={type:t,symbol:this._symbol,period:this._period,timestamp:null,callback:function(e,i){var r,n;o._loading=!1,o._addData(e,t,i),"init"===t&&(null===(n=null===(r=o._dataLoader)||void 0===r?void 0:r.subscribeBar)||void 0===n||n.call(r,{symbol:o._symbol,period:o._period,callback:function(t){o._addData(t,"update")}}))}};switch(t){case"backward":a.timestamp=null!==(i=null===(e=this._dataList[this._dataList.length-1])||void 0===e?void 0:e.timestamp)&&void 0!==i?i:null;break;case"forward":a.timestamp=null!==(n=null===(r=this._dataList[0])||void 0===r?void 0:r.timestamp)&&void 0!==n?n:null}this._dataLoader.getBars(a)}},t.prototype._processDataUnsubscribe=function(){var t,e;f(this._dataLoader)&&f(this._symbol)&&f(this._period)&&(null===(e=(t=this._dataLoader).unsubscribeBar)||void 0===e||e.call(t,{symbol:this._symbol,period:this._period}))},t.prototype.resetData=function(t){this._processDataUnsubscribe(),null==t||t(),this._loading=!1,this._processDataLoad("init")},t.prototype.getBarSpace=function(){return{bar:this._barSpace,halfBar:this._barSpace/2,gapBar:this._gapBarSpace,halfGapBar:Math.floor(this._gapBarSpace/2)}},t.prototype.setBarSpace=function(t,e){t<this._layoutOptions.barSpaceLimit.min||t>this._layoutOptions.barSpaceLimit.max||this._barSpace===t||(this._barSpace=t,this._calcOptimalBarSpace(),null==e||e(),this._adjustVisibleRange(),this.setCrosshair(this._crosshair,{notInvalidate:!0}),this._chart.layout({measureWidth:!0,update:!0,buildYAxisTick:!0,cacheYAxisWidth:!0}))},t.prototype.getLayoutOptions=function(){return this._layoutOptions},t.prototype.setTotalBarSpace=function(t){this._totalBarSpace!==t&&(this._totalBarSpace=t,this._adjustVisibleRange(),this.setCrosshair(this._crosshair,{notInvalidate:!0}))},t.prototype.setOffsetRightDistance=function(t,e){return this._offsetRightDistance="distance"===this._scrollLimitRole?Math.min(this._maxOffsetDistance.right,t):t,this._lastBarRightSideDiffBarCount=this._offsetRightDistance/this._barSpace,null!=e&&e&&(this._adjustVisibleRange(),this.setCrosshair(this._crosshair,{notInvalidate:!0}),this._chart.layout({measureWidth:!0,update:!0,buildYAxisTick:!0,cacheYAxisWidth:!0})),this},t.prototype.getInitialOffsetRightDistance=function(){return this._offsetRightDistance},t.prototype.getOffsetRightDistance=function(){return Math.max(0,this._lastBarRightSideDiffBarCount*this._barSpace)},t.prototype.getLastBarRightSideDiffBarCount=function(){return this._lastBarRightSideDiffBarCount},t.prototype.setLastBarRightSideDiffBarCount=function(t){this._lastBarRightSideDiffBarCount=t},t.prototype.setMaxOffsetLeftDistance=function(t){this._scrollLimitRole="distance",this._maxOffsetDistance.left=t},t.prototype.setMaxOffsetRightDistance=function(t){this._scrollLimitRole="distance",this._maxOffsetDistance.right=t},t.prototype.setLeftMinVisibleBarCount=function(t){this._scrollLimitRole="bar_count",this._minVisibleBarCount.left=t},t.prototype.setRightMinVisibleBarCount=function(t){this._scrollLimitRole="bar_count",this._minVisibleBarCount.right=t},t.prototype.getVisibleRange=function(){return this._visibleRange},t.prototype.startScroll=function(){this._startLastBarRightSideDiffBarCount=this._lastBarRightSideDiffBarCount},t.prototype.scroll=function(t){if(this._scrollEnabled){var e=t/this._barSpace,i=this._lastBarRightSideDiffBarCount*this._barSpace;this._lastBarRightSideDiffBarCount=this._startLastBarRightSideDiffBarCount-e,this._adjustVisibleRange(),this.setCrosshair(this._crosshair,{notInvalidate:!0}),this._chart.layout({measureWidth:!0,update:!0,buildYAxisTick:!0,cacheYAxisWidth:!0});var r=Math.round(i-this._lastBarRightSideDiffBarCount*this._barSpace);0!==r&&this.executeAction("onScroll",{distance:r})}},t.prototype.getDataByDataIndex=function(t){var e;return null!==(e=this._dataList[t])&&void 0!==e?e:null},t.prototype.coordinateToFloatIndex=function(t){var e=this._dataList.length,i=(this._totalBarSpace-t)/this._barSpace,r=e+this._lastBarRightSideDiffBarCount-i;return Math.round(1e6*r)/1e6},t.prototype.dataIndexToTimestamp=function(t){var e=this._dataList.length;if(0===e)return null;var i=this.getDataByDataIndex(t);if(f(i))return i.timestamp;if(f(this._period)){var r=e-1,n=null,o=0;if(t>r?(n=this._dataList[r].timestamp,o=t-r):t<0&&(n=this._dataList[0].timestamp,o=t),v(n)){var a=this._period,s=a.type,l=a.span;switch(s){case"second":return n+1e3*l*o;case"minute":return n+60*l*1e3*o;case"hour":return n+60*l*60*1e3*o;case"day":return n+24*l*60*60*1e3*o;case"week":return n+7*l*24*60*60*1e3*o;case"month":var u=(h=new Date(n)).getDate();h.setDate(1),h.setMonth(h.getMonth()+l*o);var c=new Date(h.getFullYear(),h.getMonth()+1,0).getDate();return h.setDate(Math.min(u,c)),h.getTime();case"year":var h;return(h=new Date(n)).setFullYear(h.getFullYear()+l*o),h.getTime()}}}return null},t.prototype.timestampToDataIndex=function(t){var e=this._dataList.length;if(0===e)return 0;if(f(this._period)){var i=null,r=0,n=e-1,o=this._dataList[n].timestamp;t>o&&(i=o,r=n);var a=this._dataList[0].timestamp;if(t<a&&(i=a,r=0),v(i)){var s=this._period,l=s.type,u=s.span;switch(l){case"second":return r+Math.floor((t-i)/(1e3*u));case"minute":return r+Math.floor((t-i)/(60*u*1e3));case"hour":return r+Math.floor((t-i)/(60*u*60*1e3));case"day":return r+Math.floor((t-i)/(24*u*60*60*1e3));case"week":return r+Math.floor((t-i)/(7*u*24*60*60*1e3));case"month":var c=new Date(i),h=new Date(t),d=c.getFullYear(),p=h.getFullYear(),g=c.getMonth(),y=h.getMonth();return r+Math.floor((12*(p-d)+(y-g))/u);case"year":d=new Date(i).getFullYear(),p=new Date(t).getFullYear();return r+Math.floor((p-d)/u)}}}return k(this._dataList,"timestamp",t)},t.prototype.dataIndexToCoordinate=function(t){var e=this._dataList.length+this._lastBarRightSideDiffBarCount-t;return Math.floor(this._totalBarSpace-(e-.5)*this._barSpace+.5)},t.prototype.coordinateToDataIndex=function(t){return Math.ceil(this.coordinateToFloatIndex(t))-1},t.prototype.floatIndexToTimestamp=function(t){var e=this._dataList.length;if(0===e)return null;var i=e-1;if(t>i&&e>=2){var r=this._dataList[i].timestamp;if((o=r-this._dataList[i-1].timestamp)>0){var n=t-i;return Math.round(r+n*o)}}if(t<0&&e>=2){var o,a=this._dataList[0].timestamp;if((o=this._dataList[1].timestamp-a)>0)return Math.round(a+t*o)}var s=Math.floor(t),l=t-s,u=this.dataIndexToTimestamp(s);if(0===l||!v(u))return u;var c=this.dataIndexToTimestamp(s+1);return v(c)?Math.round(u+(c-u)*l):u},t.prototype.timestampToFloatIndex=function(t){var e=this._dataList.length;if(0===e)return 0;var i,r=this._dataList[0].timestamp,n=this._dataList[e-1].timestamp;if(t>n&&e>=2&&(i=n-this._dataList[e-2].timestamp)>0)return e-1+(t-n)/i;if(t<r&&e>=2&&(i=this._dataList[1].timestamp-r)>0)return-((r-t)/i);for(var o=0,a=e-1,s=0;o<=a;){var l=Math.floor((o+a)/2);this._dataList[l].timestamp<=t?(s=l,o=l+1):a=l-1}var u=this._dataList[s],c=s+1<e?this._dataList[s+1]:null;if(f(u)&&f(c)){var h=u.timestamp,d=c.timestamp;if(t>=h&&d>h){var p=(t-h)/(d-h);return s+Math.min(p,1)}}return s},t.prototype.zoom=function(t,e,i){var r,n=this;if(this._zoomEnabled){var o=null!=e?e:{x:null!==(r=this._crosshair.x)&&void 0!==r?r:this._totalBarSpace/2};"xAxis"===i?"last_bar"===this._zoomAnchor.xAxis&&(o.x=this.dataIndexToCoordinate(this._dataList.length-1)):"last_bar"===this._zoomAnchor.main&&(o.x=this.dataIndexToCoordinate(this._dataList.length-1));var a=o.x,s=this.coordinateToFloatIndex(a),l=this._barSpace,u=this._barSpace+t*(this._barSpace/10);this.setBarSpace(u,(function(){n._lastBarRightSideDiffBarCount+=s-n.coordinateToFloatIndex(a)}));var c=this._barSpace/l;1!==c&&this.executeAction("onZoom",{scale:c})}},t.prototype.setZoomEnabled=function(t){this._zoomEnabled=t},t.prototype.isZoomEnabled=function(){return this._zoomEnabled},t.prototype.setZoomAnchor=function(t){m(t)?(this._zoomAnchor.main=t,this._zoomAnchor.xAxis=t):(m(t.main)&&(this._zoomAnchor.main=t.main),m(t.xAxis)&&(this._zoomAnchor.xAxis=t.xAxis))},t.prototype.getZoomAnchor=function(){return r({},this._zoomAnchor)},t.prototype.setScrollEnabled=function(t){this._scrollEnabled=t},t.prototype.isScrollEnabled=function(){return this._scrollEnabled},t.prototype.setCrosshair=function(t,e){var i,n=null!=e?e:{},o=n.notInvalidate,a=n.notExecuteAction,s=n.forceInvalidate,l=null!=t?t:{},u=0,c=0;c=v(l.x)?(u=this.coordinateToDataIndex(l.x))<0?0:u>this._dataList.length-1?this._dataList.length-1:u:u=this._dataList.length-1;var h=this._dataList[c],d=this.dataIndexToCoordinate(u),p=this._crosshair.x,g=this._crosshair.y,y=this._crosshair.paneId;this._crosshair=r(r({},l),{realX:d,kLineData:h,realDataIndex:u,dataIndex:c,timestamp:null!==(i=this.dataIndexToTimestamp(u))&&void 0!==i?i:void 0}),(p!==l.x||g!==l.y||y!==l.paneId||null!=s&&s)&&(f(h)&&(null==a||!a)&&this.hasAction("onCrosshairChange")&&m(this._crosshair.paneId)&&this.executeAction("onCrosshairChange",t),null!=o&&o||this._chart.updatePane(1))},t.prototype.getCrosshair=function(){return this._crosshair},t.prototype.executeAction=function(t,e){var i;null===(i=this._actions.get(t))||void 0===i||i.execute(e)},t.prototype.subscribeAction=function(t,e){var i;this._actions.has(t)||this._actions.set(t,new Ci),null===(i=this._actions.get(t))||void 0===i||i.subscribe(e)},t.prototype.unsubscribeAction=function(t,e){var i=this._actions.get(t);f(i)&&(i.unsubscribe(e),i.isEmpty()&&this._actions.delete(t))},t.prototype.hasAction=function(t){var e=this._actions.get(t);return f(e)&&!e.isEmpty()},t.prototype._sortIndicators=function(t){var e;m(t)?null===(e=this._indicators.get(t))||void 0===e||e.sort((function(t,e){return t.zLevel-e.zLevel})):this._indicators.forEach((function(t){t.sort((function(t,e){return t.zLevel-e.zLevel}))}))},t.prototype._calcIndicator=function(t){var e=this,i=[];if((i=i.concat(t)).length>0){var r={};i.forEach((function(t){r[t.id]=t.calcImp(e._dataList)})),this._taskScheduler.add(r)}},t.prototype.addIndicator=function(t,e){var i=t.name;if(this.getIndicatorsByFilter(t).length>0)return!1;var r=t.paneId,n=this.getIndicatorsByPaneId(r),o=new(qt(i));return this._synchronizeIndicatorSeriesPrecision(o),o.override(t),e||(this.removeIndicator({paneId:r}),n=[]),n.push(o),this._indicators.set(r,n),this._sortIndicators(r),this._calcIndicator(o),!0},t.prototype.getIndicatorsByPaneId=function(t){var e;return null!==(e=this._indicators.get(t))&&void 0!==e?e:[]},t.prototype.getIndicatorsByFilter=function(t){var e=t.paneId,i=t.name,r=t.id,n=function(t){return f(r)?t.id===r:!f(i)||t.name===i},o=[];return f(e)?o=o.concat(this.getIndicatorsByPaneId(e).filter(n)):this._indicators.forEach((function(t){o=o.concat(t.filter(n))})),o},t.prototype.removeIndicator=function(t){var e=this,i=!1;return this.getIndicatorsByFilter(null!=t?t:{}).forEach((function(t){var r=e.getIndicatorsByPaneId(t.paneId),n=r.findIndex((function(e){return e.id===t.id}));n>-1&&(r.splice(n,1),i=!0),0===r.length&&e._indicators.delete(t.paneId)})),i},t.prototype.hasIndicators=function(t){return this._indicators.has(t)},t.prototype._synchronizeIndicatorSeriesPrecision=function(t){if(f(this._symbol)){var e=this._symbol,i=e.pricePrecision,r=void 0===i?O:i,n=e.volumePrecision,o=void 0===n?Y:n,a=function(t){switch(t.series){case"price":t.setSeriesPrecision(r);break;case"volume":t.setSeriesPrecision(o)}};f(t)?a(t):this._indicators.forEach((function(t){t.forEach((function(t){a(t)}))}))}},t.prototype.overrideIndicator=function(t){var e=this,i=!1,r=!1;return this.getIndicatorsByFilter(t).forEach((function(n){var o=n.paneId;n.override(t);var a=n.paneId;if(o!==a){var s=e.getIndicatorsByPaneId(o),l=s.findIndex((function(t){return t.id===n.id}));l>-1&&s.splice(l,1),0===s.length&&e._indicators.delete(o);var u=e.getIndicatorsByPaneId(a);u.some((function(t){return t.id===n.id}))||(u.push(n),e._indicators.set(a,u)),r=!0}var c=n.shouldUpdateImp(),h=c.calc,d=c.draw;c.sort&&(r=!0),h?e._calcIndicator(n):d&&(i=!0)})),r&&this._sortIndicators(),i||r},t.prototype.getOverlaysByFilter=function(t){var e,i=t.id,r=t.groupId,n=t.paneId,o=t.name,a=function(t){return f(i)?t.id===i:f(r)?t.groupId===r&&(!f(o)||t.name===o):!f(o)||t.name===o},s=[];f(n)?s=s.concat(this.getOverlaysByPaneId(n).filter(a)):this._overlays.forEach((function(t){s=s.concat(t.filter(a))}));var l=null===(e=this._progressOverlayInfo)||void 0===e?void 0:e.overlay;return f(l)&&a(l)&&s.push(l),s},t.prototype.getOverlaysByPaneId=function(t){var e;if(!m(t)){var i=[];return this._overlays.forEach((function(t){i=i.concat(t)})),i}return null!==(e=this._overlays.get(t))&&void 0!==e?e:[]},t.prototype._sortOverlays=function(t){var e;m(t)?null===(e=this._overlays.get(t))||void 0===e||e.sort((function(t,e){return t.zLevel-e.zLevel})):this._overlays.forEach((function(t){t.sort((function(t,e){return t.zLevel-e.zLevel}))}))},t.prototype.addOverlays=function(t,e){var i=this,r=[],n=t.map((function(t,n){var o,a,l,u,c,h,d,p;if(f(t.id)){var g=null;try{for(var v=s(i._overlays),y=v.next();!y.done;y=v.next()){if(f(x=y.value[1].find((function(e){return e.id===t.id})))){g=x;break}}}catch(t){o={error:t}}finally{try{y&&!y.done&&(a=v.return)&&a.call(v)}finally{if(o)throw o.error}}if(f(g))return t.id}var m=zi(t.name);if(f(m)){var _=null!==(l=t.id)&&void 0!==l?l:D("overlay_"),x=new m,b=null!==(u=t.paneId)&&void 0!==u?u:j;t.id=_,null!==(c=t.groupId)&&void 0!==c||(t.groupId=_);var w=i.getOverlaysByPaneId(b).length;return null!==(h=t.zLevel)&&void 0!==h||(t.zLevel=w),x.override(t),r.includes(b)||r.push(b),x.isDrawing()?i._progressOverlayInfo={paneId:b,overlay:x,appointPaneFlag:e[n]}:(i._overlays.has(b)||i._overlays.set(b,[]),null===(d=i._overlays.get(b))||void 0===d||d.push(x)),x.isStart()&&(null===(p=x.onDrawStart)||void 0===p||p.call(x,{overlay:x,chart:i._chart})),_}return null}));return r.length>0&&(this._sortOverlays(),r.forEach((function(t){i._chart.updatePane(1,t)})),this._chart.updatePane(1,K)),n},t.prototype.getProgressOverlayInfo=function(){return this._progressOverlayInfo},t.prototype.progressOverlayComplete=function(){var t;if(null!==this._progressOverlayInfo){var e=this._progressOverlayInfo,i=e.overlay,r=e.paneId;i.isDrawing()||(this._overlays.has(r)||this._overlays.set(r,[]),null===(t=this._overlays.get(r))||void 0===t||t.push(i),this._sortOverlays(r),this._progressOverlayInfo=null)}},t.prototype.updateProgressOverlayInfo=function(t,e){null!==this._progressOverlayInfo&&(y(e)&&e&&(this._progressOverlayInfo.appointPaneFlag=e),this._progressOverlayInfo.paneId=t,this._progressOverlayInfo.overlay.override({paneId:t}))},t.prototype.overrideOverlay=function(t){var e=this,i=!1,r=[];return this.getOverlaysByFilter(t).forEach((function(e){e.override(t);var n=e.shouldUpdate(),o=n.sort,a=n.draw;o&&(i=!0),(o||a)&&(r.includes(e.paneId)||r.push(e.paneId))})),i&&this._sortOverlays(),r.length>0&&(r.forEach((function(t){e._chart.updatePane(1,t)})),this._chart.updatePane(1,K),!0)},t.prototype.removeOverlay=function(t){var e=this,i=[];return this.getOverlaysByFilter(null!=t?t:{}).forEach((function(t){var r,n=t.paneId,o=e.getOverlaysByPaneId(t.paneId);if(null===(r=t.onRemoved)||void 0===r||r.call(t,{overlay:t,chart:e._chart}),i.includes(n)||i.push(n),t.isDrawing())e._progressOverlayInfo=null;else{var a=o.findIndex((function(e){return e.id===t.id}));a>-1&&o.splice(a,1)}0===o.length&&e._overlays.delete(n)})),i.length>0&&(i.forEach((function(t){e._chart.updatePane(1,t)})),this._chart.updatePane(1,K),!0)},t.prototype.setPressedOverlayInfo=function(t){this._pressedOverlayInfo=t},t.prototype.getPressedOverlayInfo=function(){return this._pressedOverlayInfo},t.prototype.setHoverOverlayInfo=function(t,e,i){var r=this._hoverOverlayInfo,n=r.overlay,o=r.figureType,a=r.figureIndex,s=r.figure,l=t.overlay;if(((null==n?void 0:n.id)!==(null==l?void 0:l.id)||o!==t.figureType||a!==t.figureIndex)&&(this._hoverOverlayInfo=t,(null==n?void 0:n.id)!==(null==l?void 0:l.id))){var u=!1,c=!1;null!==n&&(n.override({zLevel:n.getPrevZLevel()}),c=!0,i(n,s)&&(u=!0)),null!==l&&(l.setPrevZLevel(l.zLevel),l.override({zLevel:Number.MAX_SAFE_INTEGER}),c=!0,e(l,t.figure)&&(u=!0)),c&&this._sortOverlays(),u||this._chart.updatePane(1)}},t.prototype.getHoverOverlayInfo=function(){return this._hoverOverlayInfo},t.prototype.setClickOverlayInfo=function(t,e,i){var r=this._clickOverlayInfo,n=r.paneId,o=r.overlay,a=r.figureType,s=r.figure,l=r.figureIndex,u=t.overlay;(null==o?void 0:o.id)===(null==u?void 0:u.id)&&a===t.figureType&&l===t.figureIndex||(this._clickOverlayInfo=t,(null==o?void 0:o.id)!==(null==u?void 0:u.id)&&(f(o)&&i(o,s),f(u)&&e(u,t.figure),this._chart.updatePane(1,t.paneId),n!==t.paneId&&this._chart.updatePane(1,n),this._chart.updatePane(1,K)))},t.prototype.getClickOverlayInfo=function(){return this._clickOverlayInfo},t.prototype.isOverlayEmpty=function(){return 0===this._overlays.size&&null===this._progressOverlayInfo},t.prototype.isOverlayDrawing=function(){var t,e;return null!==(e=null===(t=this._progressOverlayInfo)||void 0===t?void 0:t.overlay.isDrawing())&&void 0!==e&&e},t.prototype._clearLastPriceMarkExtendTextUpdateTimer=function(){this._lastPriceMarkExtendTextUpdateTimers.forEach((function(t){clearInterval(t)})),this._lastPriceMarkExtendTextUpdateTimers=[]},t.prototype._clearData=function(){this._dataLoadMore.backward=!1,this._dataLoadMore.forward=!1,this._loading=!1,this._dataList=[],this._visibleRangeDataList=[],this._visibleRangeHighLowPrice=[{x:0,price:Number.MIN_SAFE_INTEGER},{x:0,price:Number.MAX_SAFE_INTEGER}],this._visibleRange={from:0,to:0,realFrom:0,realTo:0},this._crosshair={}},t.prototype.getChart=function(){return this._chart},t.prototype.destroy=function(){this._clearData(),this._clearLastPriceMarkExtendTextUpdateTimer(),this._taskScheduler.clear(),this._overlays.clear(),this._indicators.clear(),this._actions.clear()},t}(),Xi=function(){function t(t,e){var i=this;this._chartBounding=C(),this._drawPanes=[],this._separatorPanes=new Map,this._layoutUpdateOptions={sort:!0,measureHeight:!0,measureWidth:!0,secondMeasureWidth:!1,update:!0,buildYAxisTick:!1,cacheYAxisWidth:!1,forceBuildYAxisTick:!1},this._layoutPending=!1,this._resizeObserver=null,this._resizeRequestAnimationId=_,this._scheduleResize=function(){i._resizeRequestAnimationId===_&&(i._resizeRequestAnimationId=x((function(){i._resizeRequestAnimationId=_,i._chartBounding.width===Math.floor(i._chartContainer.clientWidth)&&i._chartBounding.height===Math.floor(i._chartContainer.clientHeight)||i.resize()})))},this._cacheYAxisWidth={left:0,right:0},this._initContainer(t),this._chartEvent=new Pt(this._chartContainer,this),this._chartStore=new Hi(this,e);var n=this._chartStore.getLayoutOptions(),o=n.pane;this._candlePane=this._createPane(pi,r(r({},o),{id:j})),this._candlePane.createOrOverrideYAxis(r(r({},n.yAxis),{id:D($)})),this._xAxisPane=this._createPane(wi,r(r({},o),{id:K,order:Number.MAX_SAFE_INTEGER})),this._layout(),this._initResizeListener()}return t.prototype._initContainer=function(t){this._container=t,this._chartContainer=A("div",{position:"relative",width:"100%",height:"100%",outline:"none",borderStyle:"none",cursor:"crosshair",boxSizing:"border-box",userSelect:"none",webkitUserSelect:"none",overflow:"hidden",touchAction:"none",overscrollBehavior:"none",msUserSelect:"none",MozUserSelect:"none",webkitTapHighlightColor:"transparent"}),this._chartContainer.tabIndex=1,t.appendChild(this._chartContainer),this._cacheChartBounding()},t.prototype._cacheChartBounding=function(){this._chartBounding.width=Math.floor(this._chartContainer.clientWidth),this._chartBounding.height=Math.floor(this._chartContainer.clientHeight)},t.prototype._initResizeListener=function(){var t=this;f(ResizeObserver)?(this._resizeObserver=new ResizeObserver((function(){t._scheduleResize()})),this._resizeObserver.observe(this._chartContainer)):window.addEventListener("resize",this._scheduleResize)},t.prototype._createPane=function(t,e){var i=new t(this,e);return this._drawPanes.push(i),i},t.prototype.getDrawPaneById=function(t){if(t===j)return this._candlePane;if(t===K)return this._xAxisPane;var e=this._drawPanes.find((function(e){return e.getId()===t}));return null!=e?e:null},t.prototype.getContainer=function(){return this._container},t.prototype.getChartStore=function(){return this._chartStore},t.prototype.getXAxisPane=function(){return this._xAxisPane},t.prototype.getDrawPanes=function(){return this._drawPanes},t.prototype.getSeparatorPanes=function(){return this._separatorPanes},t.prototype.layout=function(t){var e,i,r,n,o,a,s,l,u=this;null!==(e=t.sort)&&void 0!==e&&e&&(this._layoutUpdateOptions.sort=t.sort),null!==(i=t.measureHeight)&&void 0!==i&&i&&(this._layoutUpdateOptions.measureHeight=t.measureHeight),null!==(r=t.measureWidth)&&void 0!==r&&r&&(this._layoutUpdateOptions.measureWidth=t.measureWidth),null!==(n=t.secondMeasureWidth)&&void 0!==n&&n&&(this._layoutUpdateOptions.secondMeasureWidth=t.secondMeasureWidth),null!==(o=t.update)&&void 0!==o&&o&&(this._layoutUpdateOptions.update=t.update),null!==(a=t.buildYAxisTick)&&void 0!==a&&a&&(this._layoutUpdateOptions.buildYAxisTick=t.buildYAxisTick),null!==(s=t.cacheYAxisWidth)&&void 0!==s&&s&&(this._layoutUpdateOptions.cacheYAxisWidth=t.cacheYAxisWidth),null!==(l=t.forceBuildYAxisTick)&&void 0!==l&&l&&(this._layoutUpdateOptions.forceBuildYAxisTick=t.forceBuildYAxisTick),this._layoutPending||(this._layoutPending=!0,Promise.resolve().then((function(t){u._layout(),u._layoutPending=!1})).catch((function(t){})))},t.prototype._layout=function(){var t,e=this,i=this._layoutUpdateOptions,r=i.sort,n=i.measureHeight,o=i.measureWidth,a=i.secondMeasureWidth,s=i.update,l=i.buildYAxisTick,u=i.cacheYAxisWidth,c=i.forceBuildYAxisTick;if(r){for(;f(this._chartContainer.firstChild);)this._chartContainer.removeChild(this._chartContainer.firstChild);this._separatorPanes.clear(),this._drawPanes.sort((function(t,e){return t.getOptions().order-e.getOptions().order}));var h=null;this._drawPanes.forEach((function(t){if(t.getId()!==K){if(f(h)){var i=new vi(e,"",h,t);e._chartContainer.appendChild(i.getContainer()),e._separatorPanes.set(t,i)}h=t}e._chartContainer.appendChild(t.getContainer())}))}if(n){var d=this._chartBounding.height,p=this.getStyles().separator.size,g=this._xAxisPane.getXAxisComponent().getAutoSize(),v=this._drawPanes.filter((function(t){return t.getId()!==K})),y=v.find((function(t){return"maximize"===t.getOptions().state})),m=Math.max(d-g,0),_=new Map,x=p;if(f(y))x=0,v.forEach((function(t){_.set(t,t===y?m:0)}));else{m=Math.max(m-this._separatorPanes.size*p,0);var b=null!==(t=v.find((function(t){return t.getId()===j&&"normal"===t.getOptions().state})))&&void 0!==t?t:v.find((function(t){return"normal"===t.getOptions().state}));v.forEach((function(t){if(t!==b){var e=t.getOptions(),i=e.minHeight;if("normal"===e.state){i=Math.max(e.minHeight,e.height);var r=Math.max(m,0);i>r&&(i=r)}m-=i,_.set(t,i)}})),f(b)&&_.set(b,Math.max(m,0))}this._drawPanes.forEach((function(t){var e;t.getId()!==K&&t.setBounding({height:null!==(e=_.get(t))&&void 0!==e?e:0})})),this._xAxisPane.setBounding({height:g});var w=0;this._drawPanes.forEach((function(t){var i=e._separatorPanes.get(t);f(i)&&(i.setBounding({height:x,top:w}),w+=x),t.setBounding({top:w}),w+=t.getBounding().height}))}var C=function(){var t=o;if((l||c)&&e._drawPanes.forEach((function(e){e.getYAxisComponents().forEach((function(e){var i=e.buildTicks(c);t||(t=i)}))})),t){var i=e._chartBounding.width,r=e.getStyles(),n=[],a=[],s=[],h=[],d=function(t,e,i){var r;t[e]=Math.max(null!==(r=t[e])&&void 0!==r?r:0,i)};e._drawPanes.forEach((function(t){var e=[],i=[],r=[],o=[];t.getId()!==K&&t.getWidgetYAxisComponents().forEach((function(t){var n=t;"left"===n.position?n.inside?i.push(n):e.push(n):n.inside?r.push(n):o.push(n)})),e.forEach((function(t,e){d(n,e,t.getAutoSize())})),i.forEach((function(t,e){d(a,e,t.getAutoSize())})),r.forEach((function(t,e){d(s,e,t.getAutoSize())})),o.forEach((function(t,e){d(h,e,t.getAutoSize())}))}));var p=n.reduce((function(t,e){return t+e}),0),g=h.reduce((function(t,e){return t+e}),0);u&&(p=Math.max(e._cacheYAxisWidth.left,p),g=Math.max(e._cacheYAxisWidth.right,g)),e._cacheYAxisWidth.left=p,e._cacheYAxisWidth.right=g;var v,f,y=i;y-=p,v=p,y-=g,f=g,e._chartStore.setTotalBarSpace(y);var m={width:i},_={width:y,left:v,right:f},x={width:p},b={width:g},w=r.separator.fill,C={};C=w?m:_,e._drawPanes.forEach((function(t){var i,r;null===(i=e._separatorPanes.get(t))||void 0===i||i.setBounding(C);var o={},l=0,u=0,c=0,d=0,g=[],f=[],w=[],E=[];t.getId()!==K&&t.getWidgetYAxisComponents().forEach((function(t){var e=t;"left"===e.position?e.inside?f.push(e):g.push(e):e.inside?w.push(e):E.push(e)}));var I=g.reduce((function(t,e,i){var r;return t+(null!==(r=n[i])&&void 0!==r?r:0)}),0);l=p-I;for(var T=g.length-1;T>=0;T--){var S=g[T],A=null!==(r=n[T])&&void 0!==r?r:0;o[S.id]={width:A,left:l},l+=A}f.forEach((function(t,e){var i,r=null!==(i=a[e])&&void 0!==i?i:0;o[t.id]={width:r,left:v+u},u+=r})),w.forEach((function(t,e){var i,r=null!==(i=s[e])&&void 0!==i?i:0;c+=r,o[t.id]={width:r,left:v+y-c}})),E.forEach((function(t,e){var i,r=null!==(i=h[e])&&void 0!==i?i:0;o[t.id]={width:r,left:v+y+d},d+=r})),t.setYAxesBounding(o),t.setBounding(m,_,x,b)}))}};C(),a&&C(),s&&(this._xAxisPane.getXAxisComponent().buildTicks(!0),this.updatePane(4)),this._layoutUpdateOptions={sort:!1,measureHeight:!1,measureWidth:!1,secondMeasureWidth:!1,update:!1,buildYAxisTick:!1,cacheYAxisWidth:!1,forceBuildYAxisTick:!1}},t.prototype.updatePane=function(t,e){var i=this;if(f(e)){var r=this.getDrawPaneById(e);null==r||r.update(t)}else this._drawPanes.forEach((function(e){var r;e.update(t),null===(r=i._separatorPanes.get(e))||void 0===r||r.update(t)}))},t.prototype.getDom=function(t,e){var i,r;if(!f(t))return this._chartContainer;var n=this.getDrawPaneById(t);if(f(n))switch(null!=e?e:"root"){case"root":return n.getContainer();case"main":return n.getMainWidget().getContainer();case"yAxis":return null!==(r=null===(i=n.getYAxisWidget())||void 0===i?void 0:i.getContainer())&&void 0!==r?r:null}return null},t.prototype.getSize=function(t,e){var i,r;if(!f(t))return this._chartBounding;var n=this.getDrawPaneById(t);if(f(n))switch(null!=e?e:"root"){case"root":return n.getBounding();case"main":return n.getMainWidget().getBounding();case"yAxis":return null!==(r=null===(i=n.getYAxisWidget())||void 0===i?void 0:i.getBounding())&&void 0!==r?r:null}return null},t.prototype._resetYAxisAutoCalcTickFlag=function(){this._drawPanes.forEach((function(t){t.getYAxisComponents().forEach((function(t){t.setAutoCalcTickFlag(!0)}))}))},t.prototype.setSymbol=function(t){t!==this.getSymbol()&&(this._resetYAxisAutoCalcTickFlag(),this._chartStore.setSymbol(t))},t.prototype.getSymbol=function(){return this._chartStore.getSymbol()},t.prototype.setPeriod=function(t){t!==this.getPeriod()&&(this._resetYAxisAutoCalcTickFlag(),this._chartStore.setPeriod(t))},t.prototype.getPeriod=function(){return this._chartStore.getPeriod()},t.prototype.setStyles=function(t){var e=this;this._setOptions((function(){e._chartStore.setStyles(t)}))},t.prototype.getStyles=function(){return this._chartStore.getStyles()},t.prototype.setFormatter=function(t){var e=this;this._setOptions((function(){e._chartStore.setFormatter(t)}))},t.prototype.getFormatter=function(){return this._chartStore.getFormatter()},t.prototype.setLocale=function(t){var e=this;this._setOptions((function(){e._chartStore.setLocale(t)}))},t.prototype.getLocale=function(){return this._chartStore.getLocale()},t.prototype.setTimezone=function(t){var e=this;this._setOptions((function(){e._chartStore.setTimezone(t)}))},t.prototype.getTimezone=function(){return this._chartStore.getTimezone()},t.prototype.setThousandsSeparator=function(t){var e=this;this._setOptions((function(){e._chartStore.setThousandsSeparator(t)}))},t.prototype.getThousandsSeparator=function(){return this._chartStore.getThousandsSeparator()},t.prototype.setDecimalFold=function(t){var e=this;this._setOptions((function(){e._chartStore.setDecimalFold(t)}))},t.prototype.getDecimalFold=function(){return this._chartStore.getDecimalFold()},t.prototype.setHotkey=function(t){this._chartStore.setHotkey(t)},t.prototype.getHotkey=function(){return this._chartStore.getHotkey()},t.prototype.getHotKey=function(){return this._chartStore.getHotKey()},t.prototype._setOptions=function(t){t(),this.layout({measureHeight:!0,measureWidth:!0,update:!0,buildYAxisTick:!0,forceBuildYAxisTick:!0})},t.prototype.setOffsetRightDistance=function(t){this._chartStore.setOffsetRightDistance(t,!0)},t.prototype.getOffsetRightDistance=function(){return this._chartStore.getOffsetRightDistance()},t.prototype.setMaxOffsetLeftDistance=function(t){t<0||this._chartStore.setMaxOffsetLeftDistance(t)},t.prototype.setMaxOffsetRightDistance=function(t){t<0||this._chartStore.setMaxOffsetRightDistance(t)},t.prototype.setLeftMinVisibleBarCount=function(t){t<0||this._chartStore.setLeftMinVisibleBarCount(Math.ceil(t))},t.prototype.setRightMinVisibleBarCount=function(t){t<0||this._chartStore.setRightMinVisibleBarCount(Math.ceil(t))},t.prototype.setBarSpace=function(t){this._chartStore.setBarSpace(t)},t.prototype.getBarSpace=function(){return this._chartStore.getBarSpace()},t.prototype.getVisibleRange=function(){return this._chartStore.getVisibleRange()},t.prototype._removeOrphanYAxes=function(){var t=this,e=!1;return this._drawPanes.forEach((function(i){var r=i.getId();if(r!==K){var n=new Set,o=i.getDefaultYAxisId();f(o)&&n.add(o),t._chartStore.getIndicatorsByPaneId(r).forEach((function(t){n.add(t.yAxisId)})),i.getYAxisComponents().forEach((function(t){n.has(t.id)||i.isManualYAxis(t.id)||(e=i.removeYAxis(t.id)||e)}))}})),e},t.prototype._createOrUseIndicatorYAxis=function(t,e){var i=!1;return t.hasYAxisComponent(e)||(t.createOrOverrideYAxis(r(r({},this._chartStore.getLayoutOptions().yAxis),{id:e})),i=!0),t.isManualYAxis(e)&&(t.setManualYAxis(e,!1),i=!0),i},t.prototype.resetData=function(){this._chartStore.resetData()},t.prototype.getDataList=function(){return this._chartStore.getDataList()},t.prototype.setDataLoader=function(t){this._resetYAxisAutoCalcTickFlag(),this._chartStore.setDataLoader(t)},t.prototype.createIndicator=function(t,e){var i,n,o,a,s=m(t)?{name:t}:t;if(null===qt(s.name))return null;null!==(i=s.id)&&void 0!==i||(s.id=D("".concat(s.name,"_"))),null!==(n=s.paneId)&&void 0!==n||(s.paneId=D(q));var l=this.getDrawPaneById(s.paneId);if(null!==(o=s.yAxisId)&&void 0!==o||(s.yAxisId=null!==(a=null==l?void 0:l.getDefaultYAxisId())&&void 0!==a?a:D($)),this._chartStore.addIndicator(s,null!=e&&e)){var u=!1,c=this.getDrawPaneById(s.paneId);return f(c)||(c=this._createPane(di,r(r({},this._chartStore.getLayoutOptions().pane),{id:s.paneId})),u=!0),this._createOrUseIndicatorYAxis(c,s.yAxisId),this._removeOrphanYAxes(),this.layout({sort:u,measureHeight:!0,measureWidth:!0,update:!0,buildYAxisTick:!0,forceBuildYAxisTick:!0}),s.id}return null},t.prototype.overrideIndicator=function(t){var e=this,i=this._chartStore.getIndicatorsByFilter(t);if(0===i.length)return!1;var r=this._chartStore.overrideIndicator(t);return i.forEach((function(t){var i=e.getDrawPaneById(t.paneId);f(i)&&(r=e._createOrUseIndicatorYAxis(i,t.yAxisId)||r)})),r&&(this._removeOrphanYAxes(),this.layout({measureWidth:!0,update:!0,buildYAxisTick:!0,forceBuildYAxisTick:!0})),r},t.prototype.getIndicators=function(t){return this._chartStore.getIndicatorsByFilter(null!=t?t:{})},t.prototype.removeIndicator=function(t){var e=this,i=this._chartStore.removeIndicator(null!=t?t:{});if(i){this._removeOrphanYAxes();var r=!1,n=[];this._drawPanes.forEach((function(t){var i=t.getId();i!==K&&i!==j&&(0===e._chartStore.getIndicatorsByPaneId(i).length&&n.push(i))})),n.forEach((function(t){var i=e._drawPanes.findIndex((function(e){return e.getId()===t})),n=e._drawPanes[i];f(n)&&(e._drawPanes.splice(i,1),n.destroy(),r=!0)})),this.layout({sort:r,measureHeight:r,measureWidth:!0,update:!0,buildYAxisTick:!0,forceBuildYAxisTick:!0})}return i},t.prototype.createOverlay=function(t){var e=this,i=[],r=[],n=function(t){f(t.paneId)&&null!==e.getDrawPaneById(t.paneId)?r.push(!0):(t.paneId=j,r.push(!1)),i.push(t)};m(t)?n({name:t}):d(t)?t.forEach((function(t){var e=null;e=m(t)?{name:t}:t,n(e)})):n(t);var o=this._chartStore.addOverlays(i,r);return d(t)?o:o[0]},t.prototype.getOverlays=function(t){return this._chartStore.getOverlaysByFilter(null!=t?t:{})},t.prototype.overrideOverlay=function(t){return this._chartStore.overrideOverlay(t)},t.prototype.removeOverlay=function(t){return this._chartStore.removeOverlay(null!=t?t:{})},t.prototype.setPaneOptions=function(t){var e,i,r,n=!1,o=!1,a=!1,l=f(t.id);try{for(var u=s(this._drawPanes),c=u.next();!c.done;c=u.next()){var h=c.value,d=h.getId();if(l&&t.id===d||!l){if(d!==K){var p=h.getOptions(),g=p.state;if(v(t.height)&&t.height>0){var y=Math.max(null!==(r=t.minHeight)&&void 0!==r?r:p.minHeight,0),m=Math.max(y,t.height);o=!0,n=!0,h.setBounding({height:m})}f(t.state)&&(o=!0,n=!0,"normal"===g&&"normal"!==t.state?h.setOptions({height:h.getBounding().height}):"normal"===g||"normal"!==t.state||v(t.height)||h.setBounding({height:Math.max(p.minHeight,p.height)}))}if(v(t.order)&&(o=!0,a=!0),h.setOptions(t),d===t.id)break}}}catch(t){e={error:t}}finally{try{c&&!c.done&&(i=u.return)&&i.call(u)}finally{if(e)throw e.error}}o&&this.layout({sort:a,measureHeight:n,measureWidth:!0,update:!0,buildYAxisTick:!0,forceBuildYAxisTick:!0})},t.prototype.createYAxis=function(t){var e,i,n=null!==(e=t.paneId)&&void 0!==e?e:j,o=this.getDrawPaneById(n);if(!f(o)||n===K)return null;var a=null!==(i=t.id)&&void 0!==i?i:D($);return o.hasYAxisComponent(a)||(o.createOrOverrideYAxis(r(r(r({},this._chartStore.getLayoutOptions().yAxis),t),{id:a,paneId:n})),o.setManualYAxis(a,!0),this.layout({measureWidth:!0,update:!0,buildYAxisTick:!0,forceBuildYAxisTick:!0})),a},t.prototype.removeYAxis=function(t){var e,i,r=t.id,n=t.name;if(!f(r)&&!f(n))return!1;var o=!1,a=function(t){var e=l.getDrawPaneById(t.paneId);return f(e)?e.isDefaultYAxis(t.id)&&t.paneId===j||l._chartStore.getIndicatorsByPaneId(t.paneId).some((function(e){return e.yAxisId===t.id}))?"continue":void(o=e.removeYAxis(t.id)||o):"continue"},l=this;try{for(var u=s(this.getYAxes(t)),c=u.next();!c.done;c=u.next()){a(c.value)}}catch(t){e={error:t}}finally{try{c&&!c.done&&(i=u.return)&&i.call(u)}finally{if(e)throw e.error}}return o&&this.layout({measureWidth:!0,update:!0,buildYAxisTick:!0,forceBuildYAxisTick:!0}),o},t.prototype.getYAxes=function(t){var e,i,r=t.paneId,n=t.id,o=t.name,a=function(t){return f(n)?t.id===n:!f(o)||t.name===o},s=[];return f(r)?s=s.concat(null!==(i=null===(e=this.getDrawPaneById(r))||void 0===e?void 0:e.getYAxisComponents().filter(a))&&void 0!==i?i:[]):this._drawPanes.forEach((function(t){t.getId()!==K&&(s=s.concat(t.getYAxisComponents().filter(a)))})),s},t.prototype.overrideYAxis=function(t){var e=this,i=this.getYAxes({paneId:t.paneId,id:t.id});0!==i.length&&(i.forEach((function(i){var n;null===(n=e.getDrawPaneById(i.paneId))||void 0===n||n.createOrOverrideYAxis(r(r({},t),{id:i.id}))})),this.layout({measureWidth:!0,update:!0,buildYAxisTick:!0,forceBuildYAxisTick:!0}))},t.prototype.overrideXAxis=function(t){this._xAxisPane.overrideXAxis(t),this.layout({measureHeight:!0,update:!0,buildYAxisTick:!0,forceBuildYAxisTick:!0})},t.prototype.getPaneOptions=function(t){var e;if(f(t)){var i=this.getDrawPaneById(t);return null!==(e=null==i?void 0:i.getOptions())&&void 0!==e?e:null}return this._drawPanes.map((function(t){return t.getOptions()}))},t.prototype.setZoomEnabled=function(t){this._chartStore.setZoomEnabled(t)},t.prototype.isZoomEnabled=function(){return this._chartStore.isZoomEnabled()},t.prototype.setZoomAnchor=function(t){this._chartStore.setZoomAnchor(t)},t.prototype.getZoomAnchor=function(){return this._chartStore.getZoomAnchor()},t.prototype.setScrollEnabled=function(t){this._chartStore.setScrollEnabled(t)},t.prototype.isScrollEnabled=function(){return this._chartStore.isScrollEnabled()},t.prototype.scrollByDistance=function(t,e){var i=this,r=v(e)&&e>0?e:0;if(this._chartStore.startScroll(),r>0){var n=new w({duration:r});n.doFrame((function(e){var n=t*(e/r);i._chartStore.scroll(n)})),n.start()}else this._chartStore.scroll(t)},t.prototype.scrollToRealTime=function(t){var e=this._chartStore.getBarSpace().bar,i=(this._chartStore.getLastBarRightSideDiffBarCount()-this._chartStore.getInitialOffsetRightDistance()/e)*e;this.scrollByDistance(i,t)},t.prototype.scrollToDataIndex=function(t,e){var i=(this._chartStore.getLastBarRightSideDiffBarCount()+(this.getDataList().length-1-t))*this._chartStore.getBarSpace().bar;this.scrollByDistance(i,e)},t.prototype.scrollToTimestamp=function(t,e){var i=k(this.getDataList(),"timestamp",t);this.scrollToDataIndex(i,e)},t.prototype.zoomAtCoordinate=function(t,e,i){var r=this,n=v(i)&&i>0?i:0,o=this._chartStore.getBarSpace().bar,a=o*t-o;if(n>0){var s=0,l=new w({duration:n});l.doFrame((function(t){var i=a*(t/n),o=(i-s)/r._chartStore.getBarSpace().bar*10;r._chartStore.zoom(o,null!=e?e:null,"main"),s=i})),l.start()}else this._chartStore.zoom(a/o*10,null!=e?e:null,"main")},t.prototype.zoomAtDataIndex=function(t,e,i){var r=this._chartStore.dataIndexToCoordinate(e);this.zoomAtCoordinate(t,{x:r,y:0},i)},t.prototype.zoomAtTimestamp=function(t,e,i){var r=k(this.getDataList(),"timestamp",e);this.zoomAtDataIndex(t,r,i)},t.prototype.convertToPixel=function(t,e){var i,r=this,n=null!=e?e:{},o=n.paneId,a=void 0===o?j:o,s=n.yAxisId,l=n.absolute,u=void 0!==l&&l,c=[];if(a!==K){var h=this.getDrawPaneById(a);if(null!==h){var p=h.getBounding(),g=[];g=g.concat(t);var f=this._xAxisPane.getXAxisComponent(),y=h.getYAxisComponentById(s);c=g.map((function(t){var e={},i=t.dataIndex;if(v(t.timestamp)&&(i=r._chartStore.timestampToDataIndex(t.timestamp)),v(i)&&(e.x=f.convertToPixel(i)),v(t.value)){var n=y.convertToPixel(t.value);e.y=u?p.top+n:n}return e}))}}return d(t)?c:null!==(i=c[0])&&void 0!==i?i:{}},t.prototype.convertFromPixel=function(t,e){var i,r=this,n=null!=e?e:{},o=n.paneId,a=void 0===o?j:o,s=n.yAxisId,l=n.absolute,u=void 0!==l&&l,c=[];if(a!==K){var h=this.getDrawPaneById(a);if(null!==h){var p=h.getBounding(),g=[];g=g.concat(t);var f=this._xAxisPane.getXAxisComponent(),y=h.getYAxisComponentById(s);c=g.map((function(t){var e,i={};if(v(t.x)){var n=f.convertFromPixel(t.x);i.dataIndex=n,i.timestamp=null!==(e=r._chartStore.dataIndexToTimestamp(n))&&void 0!==e?e:void 0}if(v(t.y)){var o=u?t.y-p.top:t.y;i.value=y.convertFromPixel(o)}return i}))}}return d(t)?c:null!==(i=c[0])&&void 0!==i?i:{}},t.prototype.executeAction=function(t,e){var i;if("onCrosshairChange"===t){var n=null;f(e)&&(null!==(i=(n=r({},e)).paneId)&&void 0!==i||(n.paneId=j)),this._chartStore.setCrosshair(n,{notExecuteAction:!0})}},t.prototype.subscribeAction=function(t,e){this._chartStore.subscribeAction(t,e)},t.prototype.unsubscribeAction=function(t,e){this._chartStore.unsubscribeAction(t,e)},t.prototype.getConvertPictureUrl=function(t,e,i){var r=this,n=this._chartBounding,o=n.width,a=n.height,s=A("canvas",{width:"".concat(o,"px"),height:"".concat(a,"px"),boxSizing:"border-box"}),l=s.getContext("2d"),u=I(s);s.width=o*u,s.height=a*u,l.scale(u,u),l.fillStyle=null!=i?i:"#FFFFFF",l.fillRect(0,0,o,a);var c=null!=t&&t;return this._drawPanes.forEach((function(t){var e=r._separatorPanes.get(t);if(f(e)){var i=e.getBounding();l.drawImage(e.getImage(c),i.left,i.top,i.width,i.height)}var n=t.getBounding();l.drawImage(t.getImage(c),0,n.top,o,n.height)})),s.toDataURL("image/".concat(null!=e?e:"jpeg"))},t.prototype.resize=function(){this._cacheChartBounding(),this.layout({measureHeight:!0,measureWidth:!0,secondMeasureWidth:!0,update:!0,buildYAxisTick:!0,forceBuildYAxisTick:!0})},t.prototype.destroy=function(){this._resizeRequestAnimationId!==_&&(b(this._resizeRequestAnimationId),this._resizeRequestAnimationId=_),f(this._resizeObserver)?(this._resizeObserver.disconnect(),this._resizeObserver=null):window.removeEventListener("resize",this._scheduleResize),this._chartEvent.destroy(),this._drawPanes.forEach((function(t){t.destroy()})),this._drawPanes=[],this._separatorPanes.clear(),this._chartStore.destroy(),this._container.removeChild(this._chartContainer)},t}(),Ui=new Map,Gi=1;var Zi={clone:h,merge:c,isString:m,isNumber:v,isValid:f,isObject:g,isArray:d,isFunction:p,isBoolean:y,formatValue:V,formatPrecision:H,formatBigNumber:X,formatDate:N,formatThousands:U,formatFoldDecimal:G,calcTextWidth:S,getLinearSlopeIntercept:ee,getLinearYFromSlopeIntercept:Jt,getLinearYFromCoordinates:te,checkCoordinateOnArc:ne,checkCoordinateOnCircle:le,checkCoordinateOnLine:$t,checkCoordinateOnPolygon:we,checkCoordinateOnRect:ce,checkCoordinateOnText:Ie};t.dispose=function(t){var e,i,r=null;if(t instanceof Xi)r=t.id;else{var n=null;r=null!==(e=null==(n=m(t)?document.getElementById(t):t)?void 0:n.getAttribute("k-line-chart-id"))&&void 0!==e?e:null}null!==r&&(null===(i=Ui.get(r))||void 0===i||i.destroy(),Ui.delete(r))},t.getFigureClass=function(t){var e;return null!==(e=Se[t])&&void 0!==e?e:null},t.getHotkey=_t,t.getOverlayClass=function(t){var e;return null!==(e=Yi[t])&&void 0!==e?e:null},t.getSupportedFigures=function(){return Object.keys(Se)},t.getSupportedHotkeys=xt,t.getSupportedIndicators=function(){return Object.keys(Zt)},t.getSupportedLocales=function(){return Object.keys(Le)},t.getSupportedOverlays=function(){return Object.keys(Yi)},t.init=function(t,e){var i,r=null;if(null===(r=m(t)?document.getElementById(t):t))return null;var n=Ui.get(null!==(i=r.getAttribute("k-line-chart-id"))&&void 0!==i?i:"");if(f(n))return n;var o="k_line_chart_".concat(Gi++);return(n=new Xi(r,e)).id=o,r.setAttribute("k-line-chart-id",o),Ui.set(o,n),n},t.registerFigure=function(t){Se[t.name]=Qt.extend(t)},t.registerHotkey=function(t){mt[t.name]=t},t.registerIndicator=function(t){Zt[t.name]=kt.extend(t)},t.registerLocale=function(t,e){Le[t]=r(r({},Le[t]),e)},t.registerOverlay=function(t){Yi[t.name]=Ge.extend(t)},t.registerStyles=function(t,e){Vi[t]=e},t.registerXAxis=function(t){yi[t.name]=fi.extend(t)},t.registerYAxis=function(t){ii[t.name]=J.extend(t)},t.utils=Zi,t.version=function(){return"10.0.2"}}));
    }).call(typeof window !== "undefined" ? window : this)

    // 静态安装没有动态运行时的 styles/host 门面：在这里 shim 成本地实现，
    // 于是 client/ 源码在动态与静态两种形态下逐字节相同（漂移在构造上不可能发生）。
    const styles = { insert: insertStyle }
    const host = {
      call: function (channel, payload) {
        if (channel !== 'xq.call') return Promise.resolve({ ok: false, error: '未知通道: ' + channel })
        return fetch('/xq-rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function (res) { return res.json() })
      }
    }

// 常量表：指数代码 / 周期 / 钳制常量 / 轮询间隔 / 请求规模 / 槽位 id 与 order。
// 说明：客户端没有自己的持久化文件键名 —— 界面状态的键由宿主侧 ui.get/ui.set 决定（见 store/ui.js）。
// 这里所有的值都来自重构前的字面量，一一对应，使用点见各常量后的注释。

// ---- 指数代码表：面板指数卡 / 徽标指数区 / 底部指数条三处共用同一组 ----
const XQ_INDEX_SYMBOLS = ['SH000001', 'SZ399001', 'SZ399006', 'SH000688']

// ---- 周期表 ----
// 面板周期丸顺序（不含 1m：面板只给这 7 档）
const KLINE_PERIODS = ['5m', '15m', '30m', '60m', 'day', 'week', 'month']
// 周期显示名：面板周期丸与 KlineCard 共用（KlineCard 会用到 '1m'）
const PERIOD_LABELS = { '1m': '1分', '5m': '5分', '15m': '15分', '30m': '30分', '60m': '60分', day: '日K', week: '周K', month: '月K' }
// KLineChart setPeriod 的周期映射（挂载顺序要求见 charts/kline.js 里的注释）
const KLC_PERIOD_MAP = {
  '5m': { type: 'minute', span: 5 }, '15m': { type: 'minute', span: 15 }, '30m': { type: 'minute', span: 30 },
  '60m': { type: 'hour', span: 1 }, day: { type: 'day', span: 1 }, week: { type: 'week', span: 1 }, month: { type: 'month', span: 1 }
}

// ---- 热榜市场表（数组顺序=按钮顺序）/ 市场显示名（KlineCard/HotCard 用）----
const HOT_MARKETS = [['cn', 'A股'], ['us', '美股'], ['hk', '港股'], ['global', '全球']]
const HOT_MARKET_LABELS = { cn: 'A股', hk: '港股', us: '美股', global: '全球' }

// ---- 面板 tab 条（key + 文案）----
// 顺序：原有 4 项位置不动，盈亏（pnl）为第 5 项、持仓（positions）为**追加**的第 6 项
// （宿主 ui.get 的 tab 白名单同步放行）。
const PANEL_TABS = [['market', '行情'], ['hot', '热榜'], ['search', '搜索'], ['news', '快讯'], ['pnl', '盈亏'], ['positions', '持仓']]

// ---- 请求规模参数（属于 call() 参数形状的一部分，与原字面量一致）----
const NEWS_PAGE_SIZE = 20          // news count
const HOT_LIST_SIZE = 10           // hot size
const KLINE_PAGE_SIZE = 500        // kline count（也用于右拖加载更早历史）
const KOL_SIZE = 6                 // kol count
const SEARCH_STOCK_SIZE = 8        // search count
const SEARCH_POST_SIZE = 10        // searchPosts count
const BADGE_WATCH_LIMIT = 12       // 徽标主体最多展示的自选只数

// ---- 钳制常量 ----
const BADGE_W_MIN = 120            // 徽章宽下限（grip 拖动 / 水合宽度有效性判定）
const BADGE_W_MAX = 480            // 徽章宽上限
const BADGE_W_DEFAULT = 320        // 未设置时的默认区域宽度
const BADGE_CLAMP_MIN_H = 60       // 水合时按「徽章至少 60px 高」估 y 上限
const BADGE_DRAG_THRESHOLD = 4     // 拖拽判定阈值（位移绝对值之和 > 4px 才算拖动）
const EDGE_GAP = 4                 // 距视口边缘的最小留白
const VIEWPORT_FALLBACK_W = 1200   // 取不到视口时的兜底宽
const VIEWPORT_FALLBACK_H = 800    // 取不到视口时的兜底高
const DOCK_H_MIN = 160             // 面板高度下限
const DOCK_H_MAX = 1200            // 面板高度上限
const DOCK_H_VP_RATIO = 0.85       // 面板高度不超过视口高的 85%
const DOCK_H_DEFAULT_RATIO = 0.52  // 未设置时默认视口高的 52%
const DOCK_H_FALLBACK = 420        // 取不到视口时的默认高度
const MINUTE_TIP_WRAP_FALLBACK = 640 // 分时 tooltip 左右翻转用的兜底宽度
const SAVE_UI_DEBOUNCE_MS = 800    // ui.set 落盘 debounce

// ---- 轮询间隔（毫秒）----
const POLL_MARKET_OPEN_MS = 20000     // 面板：盘中行情
const POLL_MARKET_CLOSED_MS = 60000   // 面板：休市行情
const POLL_CONTENT_OPEN_MS = 60000    // 面板：盘中热榜/快讯
const POLL_CONTENT_CLOSED_MS = 180000 // 面板：休市热榜/快讯
const POLL_BADGE_MS = 30000           // 徽标
const POLL_TICKER_MS = 30000          // 底部指数条
const POLL_DOCK_SESSION_MS = 60000    // 面板头部交易时段文案重算
// 今日盈亏（本地持仓 × 行情）：宿主回传的 next_poll_ms 缺失或过密时的兜底间隔（出错退避也用这个值）
const POSITIONS_POLL_FALLBACK_MS = 30000
const ALERT_POLL_MS = 30000
// 没有提醒规则时的空转节奏：行情隐身/面板收起后提醒轮询依然常驻，不能按 30 秒空转。
// 5 分钟一次本地文件读（宿主的 alerts.get 只读 .xueqiu-alerts.json，不出网），
// 同时保留「在别处新增了规则，这个页面也能自己发现」的能力。
const ALERT_IDLE_POLL_MS = 300000
const ALERT_NOTICE_LIMIT = 20       // 首次加载仅展示有限待确认事件，避免旧事件撑爆面板

// ---- 行情隐身（FORK-NOTES §11）----
// 快捷键命令 id：注册到宿主快捷键服务，出现在 设置 → 通用 → 快捷键 里（可看键帽、可改键）。
const XQ_SHORTCUT_TOGGLE_HIDDEN = 'xq.toggleHidden'

// ---- 槽位 id 与 order（7 个注册逐一对应，注册顺序见 slots.js）----
const SLOT_TOOLVIEW = 'tool.call.toolview'
const SLOT_INPUT_DOCK = 'conversation.input.dock'
const SLOT_OVERLAY = 'shell.overlay'
const SLOT_COMPOSER_DOCK = 'conversation.composer.dock'
const TOOLVIEW_KEYS = { quote: 'xueqiu_quote', kline: 'xueqiu_kline', hot: 'xueqiu_hot', news: 'xueqiu_news' }
const PANEL_ID = 'xueqiu-debug-panel'
const PANEL_ORDER = 30
const BADGE_ID = 'xueqiu-debug-badge'
const TICKER_ID = 'xueqiu-debug-ticker'
const TICKER_ORDER = 1

// 纯格式化：数字 / 百分比 / 大数 / 成交量 / 时间 / 涨跌配色。全部无副作用、无外部依赖。

function fmt(v, d) {
  if (v === null || v === undefined || v === '') return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  const digits = (d === undefined) ? 2 : d
  return n.toFixed(digits)
}
function fmtPct(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}
function fmtBig(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + '万'
  return String(n)
}
// 雪球 volume 字段全市场均为「股」（实证：amount/volume ≈ price，含A股/港/美/ETF/指数，
// quote/kline/minute 三接口一致）。A股口径按 1手=100股 换算显示；港/美直接以股计。
function fmtVol(v, symbol) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  const cn = /^(SH|SZ|BJ)/i.test(String(symbol || ''))
  const lots = cn ? n / 100 : n
  const unit = cn ? '手' : '股'
  if (lots >= 1e8) return (lots / 1e8).toFixed(2) + '亿' + unit
  if (lots >= 1e4) return (lots / 1e4).toFixed(2) + '万' + unit
  return (cn ? String(Math.round(lots)) : String(lots)) + unit
}
function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  function p(n) { return n < 10 ? '0' + n : String(n) }
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}
function fmtDay(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  function p(n) { return n < 10 ? '0' + n : String(n) }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function fmtFullDay(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  function p(n) { return n < 10 ? '0' + n : String(n) }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function colorOf(pct) {
  if (pct === null || pct === undefined) return 'xq-flat'
  const n = Number(pct)
  if (n > 0) return 'xq-up'
  if (n < 0) return 'xq-down'
  return 'xq-flat'
}
function upColor(up) { return up ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-success-primary)' }

// 渲染与 DOM 小工具：createElement 简写、视口、页面可见性、交易时段判定。
// 注：React 不 import —— 静态形态由 wrapper 以 react seed 门面提供，动态形态由运行时注入全局。

function el(type, props, children) { return React.createElement(type, props, children) }

function viewport() {
  try { if (typeof window !== 'undefined' && window.innerWidth) return { w: window.innerWidth, h: window.innerHeight } } catch (e) { /* ignore */ }
  try { if (typeof document !== 'undefined' && document.documentElement && document.documentElement.clientWidth) return { w: document.documentElement.clientWidth, h: document.documentElement.clientHeight } } catch (e) { /* ignore */ }
  return null
}

function pageHidden() {
  try { return typeof document !== 'undefined' && document.hidden } catch (e) { return false }
}

// 交易时段：本地 Intl 时区判定（不含节假日，仅供参考）
// segs: [[开盘分,收盘分],...]；lunch: [午休起,午休止]（可选）
function sessionState(tz, segs, lunch) {
  try {
    var now = new Date()
    var f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' })
    var p = {}
    f.formatToParts(now).forEach(function (x) { p[x.type] = x.value })
    if (p.weekday === 'Sat' || p.weekday === 'Sun') return '休市'
    var h = parseInt(p.hour, 10) % 24
    var cur = h * 60 + parseInt(p.minute, 10)
    // 与宿主 P&L 时段口径一致：收盘分钟仍属于盘中（A 股 11:30 / 15:00），
    // 午休从下一分钟开始，避免界面在边界瞬间先显示“休市/午休”。
    var inSess = segs.some(function (s) { return cur >= s[0] && cur <= s[1] })
    if (inSess) return '盘中'
    if (lunch && cur >= lunch[0] && cur < lunch[1]) return '午休'
    return cur < segs[0][0] ? '盘前' : '休市'
  } catch (e) { return '' }
}
function aSession() { return sessionState('Asia/Shanghai', [[570, 690], [780, 900]], [690, 780]) }
function hkSession() { return sessionState('Asia/Hong_Kong', [[570, 720], [780, 960]], [720, 780]) }
function usSession() { return sessionState('America/New_York', [[570, 960]], null) }
function sessionsText() {
  var a = aSession(), hk = hkSession(), us = usSession()
  if (!a && !hk && !us) return ''
  return [a && 'A股' + a, hk && '港股' + hk, us && '美股' + us].filter(Boolean).join(' · ')
}

// 宿主调用层：call() 是对 host.call('xq.call', {action,args}) 的唯一封装，外加全部 action 名常量。
// 两种形态共用同一份源码：静态 bundle 由 wrapper 提供 `const host = { call: …fetch('/xq-rpc') }`，
// 动态形态由运行时注入 host 全局。
//
// action 常量集中在这里，方便一眼核对「客户端↔宿主」的 RPC 契约（宿主 dispatch 表见宿主侧）。

const A_UI_GET = 'ui.get'
const A_UI_SET = 'ui.set'
const A_WATCHLIST_GET = 'watchlist.get'
const A_WATCHLIST_ADD = 'watchlist.add'
const A_WATCHLIST_REMOVE = 'watchlist.remove'
const A_WATCHLIST_PULL = 'watchlist.pull'
const A_QUOTE = 'quote'
const A_QUOTE_DETAIL = 'quoteDetail'
const A_KLINE = 'kline'
const A_MINUTE = 'minute'
const A_HOT = 'hot'
const A_NEWS = 'news'
const A_SEARCH = 'search'
const A_SEARCH_POSTS = 'searchPosts'
const A_LOGIN_STATUS = 'login.status'
const A_LOGIN_SAVE = 'login.save'
const A_LOGIN_LOGOUT = 'login.logout'
const A_FINANCE = 'finance'
const A_KOL = 'kol'
// 持仓 + 今日盈亏：本地持仓 × 雪球行情（宿主现算），不需要账本凭据。宿主实现见 lib/pnl/。
const A_POSITIONS_GET = 'positions.get'
const A_POSITIONS_SAVE = 'positions.save'
const A_POSITIONS_REMOVE = 'positions.remove'
// 从账本同步（**唯一**会请求账本的入口，只在用户刻意点击时调用）
const A_POSITIONS_SYNC = 'positions.sync'
// 账本凭据（Cookie / 组合 / 行情刷新间隔）：只服务 positions.sync
const A_PNL_VERIFY = 'pnl.verify'
const A_PNL_CONFIG = 'pnl.config'
// 价格提醒：规则与事件由宿主持久化，客户端只负责展示与调用。
const A_ALERTS_GET = 'alerts.get'
const A_ALERTS_SET = 'alerts.set'
const A_ALERTS_REMOVE = 'alerts.remove'
const A_ALERTS_ACK = 'alerts.ack'

// 注：用具名 async 函数表达式（构建器只认 `export function|const|let|var|class` 开头的导出行）。
const call = async function (action, args) {
  const r = await host.call('xq.call', { action: action, args: args || {} })
  if (!r || !r.ok) throw new Error((r && r.error) || '调用失败')
  return r.data
}

// UI 共享状态：面板开合 / 当前标签 / 徽章位置、尺寸与折叠形态。同时是**运行时持有者（runtime holder）**。
//
// ── 为什么需要持有者 ─────────────────────────────────────────────────────────
// 重构前所有东西都在 apply(ctx) 的闭包里，因此 ui store、saveUi（debounce 包装）、hydratePromise、
// 徽章拖拽引用、面板高度拖拽引用都是「每次 apply 一份」。拆到模块作用域后如果直接写成模块级
// 单例（例如 `const ui = {...}`），就会变成「整个模块生命周期一份」：重新 apply 时旧状态不会
// 重置，多个实例还会互相串状态——这是行为变化。
// 因此这里保留一个模块级变量 `uiRuntime`，由 apply 开头调用 createUiRuntime(ctx) 重建；
// 组件在渲染时通过 getUiRuntime() 取，语义与旧闭包一致：同一 apply 内共享、跨 apply 隔离。
//
// ── fork-fix 集中地（对照 FORK-NOTES.md，四处理由详见行内注释）────────────────
//   1. touched 守卫新增 badgePos/badgeW/dockH（原来是 open/tab 独有）
//   2. ui.set 的落盘条件从 'open' in patch 扩展为位置/尺寸任一
//   3. hydrateUi() 改为应用级、幂等、只跑一次（原来挂在 DockGate 里，切会话会重放）

// 当前 apply 的运行时（每次 apply 一份；组件渲染时经 getUiRuntime() 取）
let uiRuntime = null

function getUiRuntime() { return uiRuntime }

function createUiRuntime(ctx) {
  // ---------- 共享 UI 状态：面板开合 / 当前标签 / 徽章位置 ----------
  const ui = {
    open: false, tab: 'market', badgePos: null, badgeW: null, badgeCompact: false, dockH: null, hydrated: false,
    // [fork.7] 行情隐身：true = 三个常驻入口（面板/徽章/指数条）全部不挂载，行情轮询随之停止。
    // 放在 ui 里而不是另起一套持久化：水合、touched 守卫、落盘 debounce 全部复用现成通道。
    hidden: false,
    // [fork-fix] 已交互过的字段不被迟到的水合回滚。open/tab 原本就有这些标志，位置/尺寸/折叠状态补齐。
    openTouched: false, tabTouched: false, badgePosTouched: false, badgeWTouched: false, badgeCompactTouched: false, dockHTouched: false,
    hiddenTouched: false,
    _fns: [],
    subscribe: function (fn) {
      this._fns.push(fn)
      const self = this
      return function () {
        const i = self._fns.indexOf(fn)
        if (i !== -1) self._fns.splice(i, 1)
      }
    },
    notify: function () {
      const fns = this._fns.slice()
      for (let i = 0; i < fns.length; i++) { try { fns[i]() } catch (e) { /* ignore */ } }
    },
    set: function (patch) {
      let ch = false
      for (const k in patch) {
        if (this[k] !== patch[k]) { this[k] = patch[k]; ch = true }
        // 水合前用户已交互过的字段不做回滚（页面刚加载就点开面板/切标签，不被迟到的旧持久化打回）
        if (k === 'open') this.openTouched = true
        if (k === 'tab') this.tabTouched = true
        // [fork-fix] 位置/尺寸同样要守卫：原来只有 open/tab 有，导致切会话时重放的水合
        // 把刚拖到的徽章位置打回旧持久化值（表现为"切会话后弹回右下角"）。
        if (k === 'badgePos') this.badgePosTouched = true
        if (k === 'badgeW') this.badgeWTouched = true
        if (k === 'badgeCompact') this.badgeCompactTouched = true
        if (k === 'dockH') this.dockHTouched = true
        if (k === 'hidden') this.hiddenTouched = true
      }
      if (ch) {
        this.notify()
        // 打开面板的 set 发生在面板组件订阅建立之前（订阅在挂载后才生效）——
        // 若无人续触发 ui.set，open=true 永远不落盘，刷新后面板关着。open 翻转直接触发落盘。
        // [fork-fix] 原来只有 open 直接落盘：位置/尺寸靠 DockPanel 的订阅间接落盘，
        // 而面板收起时 DockPanel 根本不挂载（DockGate 返回 null）→ 拖徽章永不写入。
        // 改为所有被持久化的键都直接排一次落盘，不再依赖某个组件恰好挂着。
        if ('open' in patch || 'badgePos' in patch || 'badgeW' in patch || 'badgeCompact' in patch || 'dockH' in patch || 'hidden' in patch) {
          try { saveUi() } catch (e) { /* 初始化前忽略 */ }
        }
      }
    }
  }

  const saveUi = ctx.debounce(function () {
    call(A_UI_SET, { tab: ui.tab, open: ui.open, badgePos: ui.badgePos, badgeW: ui.badgeW, badgeCompact: ui.badgeCompact, dockH: ui.dockH, hidden: ui.hidden }).catch(function () { /* 忽略 */ })
  }, SAVE_UI_DEBOUNCE_MS)

  uiRuntime = {
    ctx: ctx,
    ui: ui,
    saveUi: saveUi,
    // 应用级水合 promise（幂等：已发起过就直接复用）
    hydratePromise: null,
    // 徽章拖拽引用（实例唯一）
    badgeDrag: null,
    badgeMoved: false,
    // 面板高度拖拽引用（实例唯一，避免组件重渲染丢失状态）
    dockResize: { active: false, startY: 0, startH: 0, h: 0, body: null }
  }
  return uiRuntime
}

// [fork-fix] 水合改为应用级、幂等、只跑一次。
// 下面四行是重构前的原文（"本组件"= 当时承载这段代码的 DockGate；本函数现已随代码搬到 store/ui.js）：
// ui 是全局状态（不属于任何会话），但原来 ui.get 挂在本组件里，而
// conversation.input.dock 的 scope 是 "session" → 每次切会话重挂都会重放一次水合，
// 把内存里刚拖到的新位置覆盖成旧持久化值。移到 shell.overlay 的 MiniBadge（全局只挂一次）触发。
function hydrateUi() {
  const rt = getUiRuntime()
  const ui = rt.ui
  if (rt.hydratePromise) return rt.hydratePromise
  rt.hydratePromise = call(A_UI_GET, {}).then(function (d) {
    if (d && d.tab && !ui.tabTouched) ui.set({ tab: d.tab })
    if (d && typeof d.open === 'boolean' && !ui.openTouched) ui.set({ open: d.open })
    if (d && d.badgePos && isFinite(Number(d.badgePos.x)) && isFinite(Number(d.badgePos.y)) && !ui.badgePosTouched) {
      // 恢复位置时钳制到当前视口内（视口缩小/分辨率变化后防止徽章落到屏幕外）
      // maxX 必须按徽章实际宽度算：区域模式宽达 480px，固定 -140 会让宽徽章右缘出屏
      const vp = viewport()
      const effW = (typeof d.badgeW === 'number' && isFinite(d.badgeW) && d.badgeW >= BADGE_W_MIN)
        ? Math.min(d.badgeW, BADGE_W_MAX) : BADGE_W_DEFAULT
      const maxX = (vp ? vp.w : VIEWPORT_FALLBACK_W) - effW - EDGE_GAP
      const maxY = (vp ? vp.h : VIEWPORT_FALLBACK_H) - BADGE_CLAMP_MIN_H
      ui.set({ badgePos: {
        x: Math.min(Math.max(EDGE_GAP, Number(d.badgePos.x)), Math.max(EDGE_GAP, maxX)),
        y: Math.min(Math.max(EDGE_GAP, Number(d.badgePos.y)), Math.max(EDGE_GAP, maxY))
      } })
    }
    if (d && typeof d.dockH === 'number' && isFinite(d.dockH) && !ui.dockHTouched) {
      ui.set({ dockH: d.dockH })
    }
    if (d && typeof d.badgeW === 'number' && isFinite(d.badgeW) && !ui.badgeWTouched) {
      ui.set({ badgeW: d.badgeW })
    }
    if (d && typeof d.badgeCompact === 'boolean' && !ui.badgeCompactTouched) {
      ui.set({ badgeCompact: d.badgeCompact })
    }
    // 隐身开关：必须在 hydrated 之前落定 —— 三个入口组件都等 hydrated 才渲染，
    // 否则刷新瞬间会先画出行情再消失（徽章一挂载就 fetchWatchlist、指数条一挂载就 fetchIndices）。
    if (d && typeof d.hidden === 'boolean' && !ui.hiddenTouched) {
      ui.set({ hidden: d.hidden })
    }
    ui.set({ hydrated: true })
  }).catch(function () { ui.set({ hydrated: true }) })
  return rt.hydratePromise
}

// ---------- 行情隐身（三个入口的唯一开关通道）----------
// 只改 ui.hidden：不动 open（恢复时保持用户原来的面板开合状态），不动 tab。
// ui.set 里 'hidden' 已在落盘条件内，所以这里不需要额外 saveUi。
function setUiHidden(hidden) {
  const rt = getUiRuntime()
  if (!rt) return false
  rt.ui.set({ hidden: !!hidden })
  return !!hidden
}

// 快捷键与徽章按钮共用：语义是「拨一下」而不是「设成某个值」。
function toggleUiHidden() {
  const rt = getUiRuntime()
  if (!rt) return false
  return setUiHidden(!rt.ui.hidden)
}

// 行情取数函数：本期只放各组件共用的**纯取数**封装（不引入共享 store、不做缓存/合并请求）。
// 每个函数严格等于重构前散落在各组件里的那一次 call(...) 调用（action 与参数形状不变）。

// 批量行情（面板：指数一组、自选一组；徽标：指数一组、自选前 12 只一组）
function fetchQuote(symbols, force) { return call(A_QUOTE, { symbols: symbols, force: force === true }) }

// 四大指数（面板指数卡 / 徽标指数区 / 底部指数条共用同一组代码）
function fetchIndices(force) { return call(A_QUOTE, { symbols: XQ_INDEX_SYMBOLS, force: force === true }) }

// 自选列表（面板 refreshMarket、徽标主体）
function fetchWatchlist() { return call(A_WATCHLIST_GET, {}) }

// 本地持仓 + 当日盈亏：**唯一数据源**（运行时持有者 + 单一轮询器）。
//
// 数据流：宿主持有 positions.json（主数据）并负责「持仓 × 雪球行情」的现算，
// 客户端只做三件事：按节奏取视图、把编辑动作发下去、把结果广播给订阅者。
//
// 与改造前 store/pnl.js 的差别（这次重构的核心）：
//   · 打的是宿主**本地**持仓 + 行情，不碰账本 —— 账本 Cookie 废了也不影响实时数字；
//   · 账本只在用户点「从账本同步」时被调用一次（sync()，不参与轮询）；
//   · 仍然只有一个轮询器：头部 chip、底部指数条、两个 tab 同时挂着也只有一份数据、一份请求。
//
// 为什么是「运行时持有者」而不是模块级单例：状态必须每次 apply 一份，模块级单例会在重新 apply
// 时残留旧状态、多实例互相串数据。createPositionsRuntime(ctx) 由 client/index.js 的 apply 重建。

let positionsRuntime = null

function getPositionsRuntime() { return positionsRuntime }

function createPositionsRuntime(ctx) {
  const listeners = []

  // 定时器句柄归一化：ctx.timeout 可能返回 stop 函数，也可能返回带 dispose() 的对象。
  function disposer(handle) {
    if (!handle) return null
    if (typeof handle === 'function') return handle
    if (typeof handle.dispose === 'function') return function () { handle.dispose() }
    return null
  }

  // 宿主给的节奏不可信时（缺字段 / 过密）一律回退 30 秒：宁可慢，也不能把行情打穿。
  function hostDelay(data) {
    const ms = Number(data && data.next_poll_ms)
    if (!isFinite(ms) || ms < 5000) return POSITIONS_POLL_FALLBACK_MS
    return ms
  }

  const rt = {
    ctx: ctx,
    data: null,                    // 最近一次 positions.get 的返回对象（宿主现算的视图）
    status: 'idle',                // 'idle' | 'loading' | 'ready' | 'error'
    error: '',
    listeners: listeners,
    timer: null,                   // 当前排定的下一次刷新（归一化后的 stop 函数）
    inflight: null,                // 并发去重：多处同时触发时复用同一个 promise
    refs: 0,
    active: false,
    delay: POSITIONS_POLL_FALLBACK_MS,
    visibilityBound: false,

    subscribe: function (fn) {
      listeners.push(fn)
      rt.start()
      return function () {
        const i = listeners.indexOf(fn)
        if (i !== -1) listeners.splice(i, 1)
        rt.stop()
      }
    },

    // 每次返回**新对象**：组件用 useState 存它时靠引用比较判断是否变化。
    getState: function () {
      return { data: rt.data, status: rt.status, error: rt.error }
    },

    notify: function () {
      const fns = listeners.slice()
      for (let i = 0; i < fns.length; i++) {
        try { fns[i]() } catch (e) { /* 单个订阅者抛错不影响其他订阅者 */ }
      }
    },

    // force=true 绕过行情 10 秒缓存（用户点「刷新」/「立即同步」时用）。
    refresh: function (force) {
      if (rt.inflight) return rt.inflight
      if (rt.data === null) { rt.status = 'loading'; rt.notify() }
      const p = call(A_POSITIONS_GET, force ? { force: true } : {}).then(function (data) {
        rt.data = data || null
        rt.status = 'ready'
        rt.error = ''
        rt.inflight = null
        rt.notify()
        return rt.data
      }).catch(function (e) {
        rt.status = 'error'
        rt.error = String((e && e.message) || e)
        rt.inflight = null
        rt.notify()
        return null   // 吞掉拒绝：轮询链不能产生未处理的 Promise 拒绝
      })
      rt.inflight = p
      return p
    },

    // ---- 编辑动作（宿主落盘后会回传新视图，直接替换本地数据，省掉一次往返）----
    save: function (row, originalCode) {
      const args = { row: row }
      if (originalCode) args.originalCode = originalCode
      return call(A_POSITIONS_SAVE, args).then(function (data) {
        rt.data = data
        rt.status = 'ready'
        rt.error = ''
        rt.notify()
        return data
      })
    },
    remove: function (code) {
      return call(A_POSITIONS_REMOVE, { code: code }).then(function (data) {
        rt.data = data
        rt.status = 'ready'
        rt.error = ''
        rt.notify()
        return data
      })
    },

    // 从账本同步（**唯一**会请求账本的入口，只在用户点击时调用）。
    // 返回 { ok, report, error, view }；失败时 view 仍是最新本地视图（持仓不受影响）。
    sync: function (mode) {
      return call(A_POSITIONS_SYNC, mode ? { mode: mode } : {}).then(function (res) {
        if (res && res.view) {
          rt.data = res.view
          rt.status = 'ready'
          rt.notify()
        }
        return res
      })
    },

    start: function () {
      rt.refs++
      if (rt.refs !== 1) return   // 已有轮询器在跑，chip 与各 tab 共享它
      rt.active = true
      bindVisibility()
      cycle()
    },

    stop: function () {
      rt.refs--
      if (rt.refs > 0) return
      rt.refs = 0
      rt.active = false
      unbindVisibility()
      if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    }
  }

  function arm(ms) {
    if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    rt.delay = ms
    rt.timer = disposer(ctx.timeout(cycle, ms))
  }

  // 页面从后台恢复时不要等完上一次「盘外长睡」：浏览器可能暂停/钳制定时器，
  // 正好会错过 09:30 开盘或把收盘状态留在屏幕上。可见性恢复立即走一次宿主判定，
  // 宿主会按北京时间决定是否真的去取行情。
  function onVisibility() {
    if (!rt.active || pageHidden()) return
    if (rt.timer) { try { rt.timer() } catch (e) { /* ignore */ } rt.timer = null }
    cycle()
  }
  function bindVisibility() {
    if (rt.visibilityBound) return
    try {
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', onVisibility)
        rt.visibilityBound = true
      }
    } catch (e) { /* ignore */ }
  }
  function unbindVisibility() {
    if (!rt.visibilityBound) return
    try { document.removeEventListener('visibilitychange', onVisibility) } catch (e) { /* ignore */ }
    rt.visibilityBound = false
  }

  // 一次「取数 → 按宿主给的节奏重排」。
  // 页面隐藏时跳过请求但**照旧等这么久**：重排更密没有意义（页面不可见），
  // 重排更疏又会让回到前台的第一屏变旧。
  function cycle() {
    if (!rt.active) return
    if (pageHidden()) { arm(Math.max(rt.delay, POSITIONS_POLL_FALLBACK_MS)); return }
    rt.refresh().then(function () {
      if (!rt.active) return
      arm(rt.status === 'error' ? POSITIONS_POLL_FALLBACK_MS : hostDelay(rt.data))
    })
  }

  positionsRuntime = rt
  return rt
}

/**
 * 订阅持仓视图（chip / 两个 tab / 底部指数条共用）。
 *
 * 放在 store 里而不是某个面板文件里：它现在是「全局唯一数据源」的读入口，
 * 任何组件都不该自己再造一个轮询器（改造前 chip 与 tab 各轮一次就打两遍上游）。
 */
function usePositionsState() {
  const [state, setState] = React.useState(function () {
    const rt = getPositionsRuntime()
    return rt ? rt.getState() : { data: null, status: 'idle', error: '' }
  })
  React.useEffect(function () {
    const rt = getPositionsRuntime()
    if (!rt) return function () { }
    setState(rt.getState())   // 订阅前可能已经有数据（另一个订阅者先拉到了）
    return rt.subscribe(function () { setState(rt.getState()) })
  }, [])
  return state
}

// 价格提醒 RPC 薄封装。规则/事件状态由 XueqiuPanel 持有，避免跨面板实例串状态。

function fetchAlerts() { return call(A_ALERTS_GET, {}) }
function saveAlert(symbol, target, direction, enabled) {
  return call(A_ALERTS_SET, { symbol: symbol, target: target, direction: direction, enabled: enabled })
}
function removeAlert(symbol) { return call(A_ALERTS_REMOVE, { symbol: symbol }) }
function ackAlerts(ids) { return call(A_ALERTS_ACK, { ids: ids }) }

// 价格提醒的浏览器侧通知器（**应用级**运行时）：把宿主新产生的提醒事件弹成系统通知。
//
// ── 为什么必须提到应用级（FORK-NOTES §11）────────────────────────────────────
// 宿主的 lib/alerts.js watcher 负责「是否穿越阈值 + 事件持久化」，它跟页面显示完全无关，一直在跑；
// 浏览器这一侧原来只做两件事：读事件、弹 Notification —— 而这两件事写死在 XueqiuPanel 的
// refreshAlerts 里。于是「面板收起」= 通知静默。行情隐身功能要求「不显示行情，但到价还要提醒我」，
// 这条老耦合必须拆掉：通知器跟 ui.hidden / 面板挂载都无关，只跟页面在不在有关。
//
// ── 语义 ───────────────────────────────────────────────────────────────────
//   · 首轮静默：宿主 events 是持久化历史，页面加载时不能为旧事件刷屏（第一轮只建立基线）。
//   · 之后每出现一个新事件 id 就弹一次；面板的「页面内通知区」由 panel/index.js 订阅同一份快照渲染。
//   · 空转退避：没有规则时按 ALERT_IDLE_POLL_MS（5 分钟）读一次本地文件，既不空转也不错过
//     「在别处新增了规则」；有规则时回到 ALERT_POLL_MS（30 秒，与改造前一致）。

let alertsWatchRuntime = null

function getAlertsWatchRuntime() { return alertsWatchRuntime }

// 事件身份：宿主 id 优先，缺失时退化到内容签名（与改造前 panel 内实现逐字一致）。
function alertEventId(e) {
  if (!e) return ''
  return String(e.id != null ? e.id : (e.event_id != null ? e.event_id : [e.symbol, e.target, e.direction, e.triggered_at || e.created_at || e.time].join('|')))
}

// 在用户手势里请求一次通知权限（隐身按钮点击时调用）：权限弹窗挂在定时器里常被浏览器直接拒绝。
function ensureAlertPermission() {
  const rt = alertsWatchRuntime
  if (rt) rt.ensurePermission()
}

function createAlertsWatchRuntime(ctx) {
  const listeners = []
  // event id → true：既当「首轮基线」也当「已弹过通知」的账本（同一集合，语义天然一致）
  const known = Object.create(null)
  let baselined = false
  let timer = null
  let inflight = null

  // 定时器句柄归一化：ctx.timeout 可能返回 stop 函数，也可能返回带 dispose() 的对象。
  function disposer(handle) {
    if (!handle) return null
    if (typeof handle === 'function') return handle
    if (typeof handle.dispose === 'function') return function () { handle.dispose() }
    return null
  }

  const rt = {
    ctx: ctx,
    state: { rules: [], events: [], loaded: false },
    active: false,

    getState: function () { return rt.state },

    // 订阅即补发：订阅者（面板）晚于首次取数挂载时要能立刻拿到当前快照，否则那一段会空着。
    subscribe: function (fn) {
      listeners.push(fn)
      if (rt.state.loaded) { try { fn(rt.state, []) } catch (e) { /* 单个订阅者抛错不影响其他 */ } }
      return function () {
        const i = listeners.indexOf(fn)
        if (i !== -1) listeners.splice(i, 1)
      }
    },

    refresh: function () {
      if (inflight) return inflight
      const p = fetchAlerts().then(function (data) {
        const rules = (data && Array.isArray(data.rules)) ? data.rules : []
        const events = (data && Array.isArray(data.events)) ? data.events : []
        const fresh = []
        if (!baselined) {
          // 首轮（含页面刷新后的首次）：只建立基线，不为历史事件弹通知。
          baselined = true
          for (let i = 0; i < events.length; i++) known[alertEventId(events[i])] = true
        } else {
          for (let i = 0; i < events.length; i++) {
            const id = alertEventId(events[i])
            if (known[id]) continue
            known[id] = true
            fresh.push(events[i])
          }
        }
        rt.state = { rules: rules, events: events, loaded: true }
        inflight = null
        const fns = listeners.slice()
        for (let i = 0; i < fns.length; i++) {
          try { fns[i](rt.state, fresh) } catch (e) { /* 单个订阅者抛错不影响其他 */ }
        }
        if (fresh.length) fire(fresh)
        return rt.state
      }).catch(function () {
        // 读失败不是致命错误：保留上一份快照，节奏由 cycle 决定下一步（不阻断后续轮询）。
        inflight = null
        return rt.state
      })
      inflight = p
      return p
    },

    // 规则被增删改之后立刻核对一次（不用等下一个 tick，也不必自己维护一份基线）。
    kick: function () {
      if (!rt.active) return Promise.resolve(rt.state)
      if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
      return rt.refresh()
    },

    ensurePermission: function () {
      try {
        if (typeof window === 'undefined' || !window.Notification) return
        if (window.Notification.permission !== 'default') return
        if (typeof window.Notification.requestPermission !== 'function') return
        window.Notification.requestPermission().catch(function () { /* 用户拒绝/浏览器不支持：静默 */ })
      } catch (e) { /* ignore */ }
    },

    start: function () {
      if (rt.active) return
      rt.active = true
      bindVisibility()
      cycle()
    },

    stop: function () {
      rt.active = false
      unbindVisibility()
      if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
    }
  }

  function fire(events) {
    try {
      if (typeof window === 'undefined' || !window.Notification) return
      const title = '雪球价格提醒'
      const show = function (e) {
        const text = (e.name || e.symbol || '标的') + ' ' + (e.direction === 'below' ? '≤' : '≥') + ' ' + (e.target == null ? '' : e.target) + (e.current == null ? '' : '，现价 ' + e.current)
        return new window.Notification(title, { body: text, tag: 'xq-alert-' + alertEventId(e) })
      }
      if (window.Notification.permission === 'granted') {
        for (let i = 0; i < events.length; i++) { try { show(events[i]) } catch (e) { /* ignore */ } }
      } else if (window.Notification.permission === 'default' && typeof window.Notification.requestPermission === 'function') {
        window.Notification.requestPermission().then(function (permission) {
          if (permission !== 'granted') return
          for (let i = 0; i < events.length; i++) { try { show(events[i]) } catch (e) { /* ignore */ } }
        }).catch(function () { /* ignore */ })
      }
    } catch (e) { /* 浏览器权限/实现异常静默：页面内通知区仍然会列出事件 */ }
  }

  function arm(ms) {
    if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
    timer = disposer(ctx.timeout(cycle, ms))
  }

  // 一次「取数 → 按规则数量重排」。取数失败时 state.loaded 仍是上次的值：
  // 从没读成功过就按 30 秒快速重试，读成功过就照规则数量决定节奏。
  function cycle() {
    if (!rt.active) return
    rt.refresh().then(function (state) {
      if (!rt.active) return
      if (!state.loaded) { arm(ALERT_POLL_MS); return }
      arm(state.rules.length ? ALERT_POLL_MS : ALERT_IDLE_POLL_MS)
    })
  }

  // 页面从后台回来时立刻补一次：后台标签页的定时器会被钳制，错过的那段时间要在这里追上。
  function onVisibility() {
    if (!rt.active) return
    if (timer) { try { timer() } catch (e) { /* ignore */ } timer = null }
    cycle()
  }
  function bindVisibility() {
    try { if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', onVisibility) } catch (e) { /* ignore */ }
  }
  function unbindVisibility() {
    try { if (typeof document !== 'undefined' && document.removeEventListener) document.removeEventListener('visibilitychange', onVisibility) } catch (e) { /* ignore */ }
  }

  alertsWatchRuntime = rt
  return rt
}

// 图表引擎：KLineChart v10（canvas）。初始化 / 主题同步 / 尺寸自适应 / 销毁 与具体图表无关的部分都在这里。

// ---------- 图表引擎：KLineChart v10（canvas；UMD 由 tools/build.mjs 内联进静态形态，动态调试会话无库时降级提示） ----------
// 选型对比（2026-08，实测 gzip 体积）：KLineChart 10.0.2 59.8KB vs lightweight-charts 5.2.1 62.3KB vs ECharts ~330KB。
// 胜出理由：零依赖、A股原生观感（红涨绿跌）、内置 MA/VOL 指标与十字光标 legend、dataLoader 反向加载直接对接右拖拉历史。
function klcLib() {
  try { return (typeof window !== 'undefined' && window.klinecharts) || null } catch (e) { return null }
}

function cssVarColor(name, fallback) {
  try {
    // 主题令牌定义在 <body>（GUI 主题层），<html> 上读不到——曾因此永远拿不到令牌、
    // 双主题都渲染硬编码回退色（浅色下图例 #8a8f98 对白底对比度仅 ~1.8:1）
    let v = getComputedStyle(document.body).getPropertyValue(name).trim()
    if (!v) v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch (e) { return fallback }
}

// canvas 不能用 CSS 变量，主题色在 init/主题变化时解析为具体色值
function klcPalette() {
  return {
    up: cssVarColor('--dsw-alias-state-error-primary', '#ef4444'),
    down: cssVarColor('--dsw-alias-state-success-primary', '#22c55e'),
    grid: cssVarColor('--dsw-alias-border-l2', 'rgba(128,128,128,0.25)'),
    text: cssVarColor('--dsw-alias-label-secondary', '#8a8f98'),
    warn: cssVarColor('--dsw-alias-state-warn-primary', '#f59e0b')
  }
}

function klcStyles(kind, pal) {
  const s = {
    grid: { horizontal: { color: pal.grid }, vertical: { show: false } },
    candle: {
      bar: {
        upColor: pal.up, downColor: pal.down, noChangeColor: pal.text,
        upBorderColor: pal.up, downBorderColor: pal.down, noChangeBorderColor: pal.text,
        upWickColor: pal.up, downWickColor: pal.down, noChangeWickColor: pal.text
      },
      // OHLC 图例：K线常显最新一根（v1.22.5 起紧凑中文单行、字号 10，不再压蜡烛）；
      // 悬停十字光标时跟随显示对应根；分时在下方 minute 分支整体关闭。
      // 默认英文 time/open/... 标题太长会折成两行——已换中文单行
      tooltip: {
        showRule: 'always',
        title: { show: false },
        legend: {
          size: 10, color: pal.text,
          template: [
            { title: '开', value: '{open}' }, { title: '高', value: '{high}' },
            { title: '低', value: '{low}' }, { title: '收', value: '{close}' },
            { title: '量', value: '{volume}' }
          ]
        }
      },
      priceMark: {
        // 关闭最高/最低点重复标注（窄图时易与坐标轴重叠成杂乱数字），保留最新价标
        high: { show: false }, low: { show: false },
        last: { upColor: pal.up, downColor: pal.down, noChangeColor: pal.text, text: { color: pal.text } }
      }
    },
    indicator: {
      bars: [{ upColor: pal.up, downColor: pal.down, noChangeColor: pal.text }],
      // 和谐 MA 配色：蓝/橙/紫/青，多均线更易区分（对齐雪球观感）
      lines: [{ color: '#3b82f6' }, { color: '#f59e0b' }, { color: '#8b5cf6' }, { color: '#06b6d4' }],
      // MA 数值悬停显示（蜡烛图例一行 + MA 图例一行，同雪球）；常驻关闭避免压图
      tooltip: { showRule: 'follow_cross' }
    },
    xAxis: { axisLine: { color: pal.grid }, tickLine: { color: pal.grid }, tickText: { color: pal.text } },
    yAxis: { axisLine: { color: pal.grid }, tickLine: { color: pal.grid }, tickText: { color: pal.text } },
    separator: { color: pal.grid },
    crosshair: {
      horizontal: { line: { color: pal.text }, text: { backgroundColor: pal.text } },
      vertical: { line: { color: pal.text }, text: { backgroundColor: pal.text } }
    }
  }
  if (kind === 'minute') {
    // 分时：面积图 + 昨收虚线 + 均价线（xq-minute 指标），涨跌色由调用方按收盘定
    s.candle.type = 'area'
    s.candle.area = { lineSize: 1.4, lineColor: pal.up, backgroundColor: 'rgba(239,68,68,0.10)', value: 'close', smooth: false }
    s.candle.priceMark = { high: { color: pal.text }, low: { color: pal.text }, last: { upColor: pal.up, downColor: pal.down, noChangeColor: pal.text, text: { color: pal.text } } }
    // 分时悬停信息已由自定义 .xq-tip（价/均价/涨跌）承担；面积图开=高=低=收同值，
    // canvas OHLC 图例纯冗余且与 .xq-tip 双份叠加 → 蜡烛与指标图例整体关闭
    s.candle.tooltip = { showRule: 'none' }
    s.indicator = { tooltip: { showRule: 'none' } }
  }
  return s
}

// 通用图表生命周期：init + 主题监听 + 尺寸自适应，返回清理函数
function klcSetup(K, boxRef, kind) {
  const chart = K.init(boxRef.current, { styles: klcStyles(kind, klcPalette()) })
  if (!chart) return null
  // 卸载清理时 boxRef.current 已被 React 置 null，dispose 须用闭包捕获的节点
  const box = boxRef.current
  let ro = null
  try {
    ro = new ResizeObserver(function () { chart.resize() })
    ro.observe(boxRef.current)
  } catch (e) { /* 旧环境无 RO */ }
  let mo = null
  try {
    mo = new MutationObserver(function () { chart.setStyles(klcStyles(kind, klcPalette())) })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
  } catch (e) { /* 忽略 */ }
  // GUI 跟随系统配色时 DOM 属性不变（上面的 MutationObserver 永不触发），
  // 主题翻转唯一可靠信号是 matchMedia change
  let mqOff = null
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = function () { try { chart.setStyles(klcStyles(kind, klcPalette())) } catch (e) { /* ignore */ } }
    if (mq.addEventListener) { mq.addEventListener('change', onScheme); mqOff = function () { mq.removeEventListener('change', onScheme) } }
    else if (mq.addListener) { mq.addListener(onScheme); mqOff = function () { mq.removeListener(onScheme) } }
  } catch (e) { /* ignore */ }
  // 拖拽光标反馈（K线/分时共用）：悬停小手、按住抓手（松手点可能在图外，需 window 级兜底复位）
  const onCurDown = function () { try { box.classList.add('xq-dragging') } catch (e) { /* 忽略 */ } }
  const onCurUp = function () { try { box.classList.remove('xq-dragging') } catch (e) { /* 忽略 */ } }
  try {
    box.addEventListener('mousedown', onCurDown)
    box.addEventListener('mouseup', onCurUp)
    box.addEventListener('mouseleave', onCurUp)
    window.addEventListener('mouseup', onCurUp)
  } catch (e) { /* 忽略 */ }
  return {
    chart: chart,
    dispose: function () {
      if (ro) ro.disconnect()
      if (mo) mo.disconnect()
      if (mqOff) mqOff()
      try {
        box.removeEventListener('mousedown', onCurDown)
        box.removeEventListener('mouseup', onCurUp)
        box.removeEventListener('mouseleave', onCurUp)
        window.removeEventListener('mouseup', onCurUp)
      } catch (e) { /* 忽略 */ }
      // 卸载清理时 boxRef.current 已被 React 置 null（与 dblclick 监听同类坑），须闭包捕获节点
      try { K.dispose(box) } catch (e) { /* 忽略 */ }
    }
  }
}

function klcNoLib() {
  return el('div', { className: 'xq-muted', style: { padding: '24px 0', textAlign: 'center' } },
    '图表引擎（KLineChart）未加载：静态安装形态自带，动态调试会话不含 vendored 库')
}

// rows 归一化：面板行为 {timestamp(ms),open,high,low,close,volume}；卡片行为 {time(ISO),...} → 补 timestamp
function klcNormRows(rows) {
  return (rows || []).map(function (r) {
    if (r.timestamp) return r
    const t = r.time ? Date.parse(r.time) : NaN
    return Object.assign({}, r, { timestamp: isNaN(t) ? 0 : t })
  }).filter(function (r) { return r.timestamp > 0 })
}

function klcPrecision(rows, hint) {
  if (hint != null) return hint
  try {
    const s = String(rows.length ? rows[rows.length - 1].close : '')
    const d = (s.split('.')[1] || '').length
    return Math.max(0, Math.min(4, d || 2))
  } catch (e) { return 2 }
}

// K线蜡烛图（KLineChart：内置 MA/VOL、滚轮缩放、拖拽平移、右拖自动加载更早历史）。

// ---------- K线蜡烛图（KLineChart：内置 MA/VOL、滚轮缩放、拖拽平移、右拖自动加载更早历史） ----------
function KlineChart(props) {
  const rows = props.rows || []
  const onNeedEarlier = props.onNeedEarlier || null
  const boxRef = React.useRef(null)
  const [noLib, setNoLib] = React.useState(false)
  const propsRef = React.useRef(null)
  propsRef.current = { rows: rows, onNeedEarlier: onNeedEarlier }

  // v1.22.10 起周期切换只清 kline 数据不重建详情骨架，图表可能先以空 rows 挂载、
  // 数据后到——与 MinuteChart 的 hasData 同款门控：空数据不建图，rows 到达时重建
  const hasRows = rows.length > 0
  React.useEffect(function () {
    const K = klcLib()
    if (!K || !boxRef.current) { setNoLib(true); return undefined }
    if (!hasRows) return undefined
    const h = klcSetup(K, boxRef, 'kline')
    if (!h) { setNoLib(true); return undefined }
    const chart = h.chart
    let busy = false
    // 顺序要求（实测 v10）：setPeriod → setSymbol → setDataLoader。若 setSymbol 在 setPeriod 之前，
    // 两者各触发一次 init 导致数据重复叠加；setPeriod 必须设置，否则 crosshair 不触发。
    const pm = KLC_PERIOD_MAP
    chart.setPeriod(pm[props.period] || { type: 'day', span: 1 })
    chart.setSymbol({ ticker: props.symbol || 'xq', pricePrecision: klcPrecision(rows, props.precision), volumePrecision: 2 })
    chart.setDataLoader({
      getBars: function (params) {
        const done = params.callback
        if (params.type === 'init') {
          done(klcNormRows(propsRef.current.rows), { forward: true, backward: false })
          return
        }
        // v10 语义（源码 _processDataLoad/_addData）：'backward'=锚定最后一根、concat 到尾部，即拉"更新"数据
        // （盘中右缘新K线）；'forward'=锚定第一根、前插，即拉"更早"历史（右拖触底）。A股场景无实时增量，backward 恒空。
        if (params.type !== 'forward' || busy) { done([], { forward: false, backward: false }); return }
        const fetch = propsRef.current.onNeedEarlier
        if (!fetch) { done([], { forward: false, backward: false }); return }
        busy = true
        Promise.resolve(fetch(params.timestamp)).then(function (fresh) {
          busy = false
          const add = (fresh || []).filter(function (r) { return r.timestamp < params.timestamp })
          done(add, { forward: add.length > 0, backward: false })
        }, function () { busy = false; done([], { forward: false, backward: false }) })
      }
    })
    // 均线叠加到主图蜡烛 pane（paneId 指定已有主图，不传则默认新开附图 pane）——与雪球一致
    chart.createIndicator({ name: 'MA', paneId: 'candle_pane' })
    chart.createIndicator('VOL')
    chart.setOffsetRightDistance(16)
    // 双击回最新（标签文案承诺过；kline v10 自带 dblclick 仅做空十字，需手动 scrollToRealTime）
    // 拖拽光标反馈已统一在 klcSetup（K线/分时共用）
    const box = boxRef.current
    const onDbl = function () { try { chart.scrollToRealTime() } catch (e) { /* 忽略 */ } }
    box.addEventListener('dblclick', onDbl)
    return function () {
      // 卸载清理时 boxRef.current 已被 React 置 null（切 tab 触发，曾致槽位整体崩溃），须闭包捕获节点
      try { box.removeEventListener('dblclick', onDbl) } catch (e) { /* 忽略 */ }
      h.dispose()
    }
  }, [hasRows])

  if (noLib) return klcNoLib()
  const norm = rows.length && !rows[0].timestamp ? klcNormRows(rows) : rows
  return el('div', { className: 'xq-chart-wrap' }, [
    el('div', { key: 'c', ref: boxRef, className: 'xq-klc' }),
    el('div', { key: 'lb', className: 'xq-chart-labels' }, [
      el('span', { key: 'd' }, norm.length ? fmtDay(norm[0].timestamp) + ' ~ ' + fmtDay(norm[norm.length - 1].timestamp) : ''),
      el('span', { key: 'n' }, norm.length + ' 根 · 滚轮缩放 · 右拖加载更早 · 双击回最新')
    ])
  ])
}

// 分时图（面积价线 + 昨收虚线 + 均价线 + 十字光标 tooltip）。

// ---------- 分时图（面积价线 + 昨收虚线 + 均价线 + 十字光标 tooltip） ----------
function MinuteChart(props) {
  const items = props.items || []
  const lastClose = Number(props.lastClose) || 0
  const boxRef = React.useRef(null)
  const wrapRef = React.useRef(null)
  const [noLib, setNoLib] = React.useState(false)
  const [hi, setHi] = React.useState(null)
  const baseRef = React.useRef({ lastClose: lastClose })
  baseRef.current = { lastClose: lastClose }
  // 分时数据是详情页渐进渲染晚到的一块（quote+kline 先上屏、minute 随后 merge）：
  // effect 依赖 [] 曾导致空 items 挂载后数据到达永不刷新（空白图）。改为「空数据不挂图表，
  // 数据到达（hasData 变 true）时重建」，彻底消除竞态窗口。
  const hasData = items.length > 0

  React.useEffect(function () {
    const K = klcLib()
    if (!K || !boxRef.current) { setNoLib(true); return undefined }
    if (!hasData) return undefined   // 数据未到：不建图表（等 hasData 变 true 重建）
    // 自定义指标：昨收虚线 + 均价线（series normal → 单独附图，避免干扰价格轴刻度）
    // 注意：registerIndicator 全局只注册一次，calc 闭包捕获的是首次挂载实例的 baseRef——
    // 切换股票后旧 calc 仍读旧实例的昨收（宁德分时曾因此挂上茅台昨收 1304，y 轴被撑爆成直线）。
    // 因此每次挂载都 overrideIndicator 换成绑定当前 baseRef 的新 calc。
    if (K.getSupportedIndicators().indexOf('xq-minute') < 0) {
      K.registerIndicator({
        name: 'xq-minute', shortName: '分时', series: 'normal',
        calc: function (dataList) {
          const base = baseRef.current.lastClose
          return dataList.map(function (d) {
            return { avg: Number(d.avg_price != null ? d.avg_price : d.close), base: base }
          })
        },
        figures: [
          { key: 'base', title: '昨收: ', type: 'line', styles: function () { return { style: 'dashed', size: 1, color: cssVarColor('--dsw-alias-label-secondary', '#8a8f98') } } },
          { key: 'avg', title: '均价: ', type: 'line', styles: function () { return { style: 'solid', size: 1, color: cssVarColor('--dsw-alias-state-warn-primary', '#f59e0b') } } }
        ]
      })
    }
    const h = klcSetup(K, boxRef, 'minute')
    if (!h) { setNoLib(true); return undefined }
    const chart = h.chart
    // 数据映射：分时 items → KLineData（current 充当 o/h/l/c；avg_price/pct 挂扩展字段供指标与 tooltip 用）
    const toBars = function (list, lclose) {
      return (list || []).map(function (it) {
        const c = Number(it.current)
        const pct = lclose ? (c - lclose) / lclose * 100 : (it.percent != null ? Number(it.percent) : null)
        return {
          timestamp: Number(it.timestamp), open: c, high: Number(it.high) || c, low: Number(it.low) || c, close: c,
          volume: Number(it.volume) || 0, avg_price: it.avg_price, pct: pct
        }
      }).filter(function (d) { return d.timestamp > 0 })
    }
    const barsRef = { v: toBars(items, lastClose) }
    // 顺序要求（实测 v10）：setPeriod → setSymbol → setDataLoader（挂载 loader 触发唯一一次 init；
    // 不 setPeriod 则 crosshair 不触发，setSymbol 先于 setPeriod 会双 init 重复叠加数据）
    chart.setPeriod({ type: 'minute', span: 1 })
    chart.setSymbol({ ticker: props.symbol || 'xq', pricePrecision: klcPrecision(barsRef.v, props.precision), volumePrecision: 2 })
    chart.setDataLoader({
      getBars: function (params) {
        if (params.type === 'init') params.callback(barsRef.v, { backward: false, forward: false })
        else params.callback([], { backward: false, forward: false })
      }
    })
    const last = items.length ? Number(items[items.length - 1].current) : 0
    const up = lastClose ? last >= lastClose : true
    // 涨跌色改面积线色（palette up 色对A股即"涨"）
    chart.setStyles({ candle: { type: 'area', area: { lineColor: up ? klcPalette().up : klcPalette().down, backgroundColor: up ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)' } } })
    chart.createIndicator({ name: 'xq-minute', paneId: 'candle_pane' })   // 均价/昨收叠加到主图分时曲线（与雪球一致）
    // 绑定当前实例 baseRef 的 calc（防跨股票串昨收，见上方注释）
    chart.overrideIndicator({ name: 'xq-minute', calc: function (dataList) {
      const base = baseRef.current.lastClose
      return dataList.map(function (d) {
        return { avg: Number(d.avg_price != null ? d.avg_price : d.close), base: base }
      })
    } })
    // 分时固定视角：禁缩放拖拽，全部笔数铺满宽度
    chart.setZoomEnabled(false)
    chart.setScrollEnabled(false)
    chart.setOffsetRightDistance(4)
    if (items.length > 1 && boxRef.current.clientWidth) {
      chart.setBarSpace(Math.max(boxRef.current.clientWidth / (items.length + 6), 0.1))
    }
    // v10.0.2 的 onCrosshairChange 事件只带 {x,y,paneId}（文档声称的 kLineData 字段实际未填），
    // 用 convertFromPixel 反查 dataIndex，再从自有 bars 取明细
    chart.subscribeAction('onCrosshairChange', function (d) {
      if (!d || typeof d.x !== 'number') { setHi(null); return }
      let p = null
      try { const r = chart.convertFromPixel([{ x: d.x, y: d.y }]); p = r && r[0] } catch (e) { /* 忽略 */ }
      const di = p && typeof p.dataIndex === 'number' ? p.dataIndex : -1
      if (di >= 0 && di < barsRef.v.length) setHi({ r: barsRef.v[di], x: d.x })
      else setHi(null)
    })
    return function () {
      try { chart.unsubscribeAction('onCrosshairChange') } catch (e) { /* 忽略 */ }
      h.dispose()
    }
  }, [hasData, props.symbol])

  if (noLib) return klcNoLib()
  if (!hasData) return el('div', { className: 'xq-chart-wrap', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dsw-alias-label-secondary)', fontSize: 12 } }, '分时数据加载中…')
  // 十字光标 tooltip（沿用 .xq-tip 卡片）
  let tip = null
  if (hi && hi.r) {
    const r = hi.r
    const pct = r.pct != null ? Number(r.pct) : null
    const wrapW = (wrapRef.current && wrapRef.current.offsetWidth) || MINUTE_TIP_WRAP_FALLBACK
    const x = typeof hi.x === 'number' ? hi.x : 0
    tip = el('div', {
      key: 'tip', className: 'xq-tip',
      style: { left: x + 'px', transform: x > wrapW * 0.55 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)' }
    }, [
      el('div', { key: 'd', className: 'xq-tip-d' }, fmtTime(r.timestamp)),
      el('div', { key: 'r1', className: 'xq-tip-r' }, [
        el('span', { key: 'p', className: colorOf(pct) }, [el('span', { key: 'k', className: 'xq-tip-k' }, '价 '), fmt(r.close)]),
        el('span', { key: 'a' }, [el('span', { key: 'k', className: 'xq-tip-k' }, '均价 '), fmt(r.avg_price)]),
        el('span', { key: 'g', className: colorOf(pct) }, [el('span', { key: 'k', className: 'xq-tip-k' }, '涨跌 '), fmtPct(pct)])
      ])
    ])
  }
  return el('div', { className: 'xq-chart-wrap', ref: wrapRef }, [
    tip,
    el('div', { key: 'c', ref: boxRef, className: 'xq-klc xq-klc-min' }),
    el('div', { key: 'lb', className: 'xq-chart-labels' }, [
      el('span', { key: 'd' }, items.length ? fmtDay(items[0].timestamp) + ' 分时' : ''),
      el('span', { key: 'n' }, items.length + ' 笔')
    ])
  ])
}

// Agent 工具调用卡片的取数：tool-result block → JSON。

// execute 返回 JSON 字符串；从 tool-result block 的 content 里递归找 text 再 parse（us-stocks 同款防御）。
function xqToolText(content, depth) {
  depth = depth || 0
  if (depth > 3 || !Array.isArray(content)) return undefined
  for (let i = 0; i < content.length; i++) {
    const b = content[i]
    if (!b || typeof b !== 'object') continue
    if (b.type === 'text' && typeof b.text === 'string') return b.text
    const nested = xqToolText(b.content, depth + 1)
    if (nested !== undefined) return nested
  }
  return undefined
}
function xqParseResult(block) {
  // block 可能是运行中（无 kind）或已完成（kind=tool-result）
  if (!block || typeof block !== 'object') return null
  const text = xqToolText(block.content)
  if (text === undefined) return null
  try {
    const v = JSON.parse(text)
    return (v && typeof v === 'object') ? v : null
  } catch (e) { return null }
}

// Agent 工具调用卡片（tool.call.toolview）：xueqiu_quote / xueqiu_kline / xueqiu_hot / xueqiu_news。

// ---------- Agent 工具调用卡片（tool.call.toolview）：xueqiu_quote / xueqiu_kline ----------
function QuoteCard(props) {
  const block = props.block
  const r = xqParseResult(block)
  if (!r) return el('div', { className: 'xq-tv-shell' }, block && block.kind ? '结果不可读' : '查询中…')
  const list = Array.isArray(r.list) ? r.list : []
  if (!list.length) return el('div', { className: 'xq-tv-shell' }, '无行情数据（检查代码，或先用 xueqiu_search 查代码）')
  return el('div', { className: 'xq-tv-shell' }, [
    el('div', { key: 'h', className: 'xq-tv-head' }, [
      el('span', { key: 't', className: 'xq-tv-title' }, '雪球行情'),
      el('span', { key: 'n', className: 'xq-tv-pill' }, list.length + ' 只'),
      r.status ? el('span', { key: 's', className: 'xq-tv-pill' }, r.status) : null
    ]),
    el('div', { key: 'b', className: 'xq-tv-table' }, list.map(function (q) {
      const up = Number(q.percent) > 0, dn = Number(q.percent) < 0
      return el('div', { key: q.symbol, className: 'xq-tv-row' }, [
        el('span', { key: 'n', className: 'xq-tv-name' }, [
          String(q.name || ''),
          el('span', { key: 'c', className: 'xq-tv-code' }, ' ' + String(q.symbol || ''))
        ]),
        el('span', { key: 'p', className: 'xq-tv-price ' + (up ? 'xq-up' : dn ? 'xq-down' : '') }, fmt(q.current)),
        el('span', { key: 'g', className: 'xq-tv-pct ' + (up ? 'xq-up' : dn ? 'xq-down' : '') },
          fmtPct(q.percent))
      ])
    }))
  ])
}

function KlineCard(props) {
  const block = props.block
  const r = xqParseResult(block)
  if (!r) return el('div', { className: 'xq-tv-shell' }, block && block.kind ? '结果不可读' : '查询中…')
  if (r.error) return el('div', { className: 'xq-tv-shell' }, String(r.error))
  const rows = Array.isArray(r.rows) ? r.rows : []
  if (!rows.length) return el('div', { className: 'xq-tv-shell' }, '无K线数据')
  const first = rows[0], last = rows[rows.length - 1]
  const chgPct = Number(first.close) ? (Number(last.close) - Number(first.close)) / Number(first.close) * 100 : 0
  const lb = PERIOD_LABELS
  // 复用面板蜡烛图（rows 字段兼容：卡片 rows 已含 open/high/low/close/volume）
  return el('div', { className: 'xq-tv-shell' }, [
    el('div', { key: 'h', className: 'xq-tv-head' }, [
      el('span', { key: 't', className: 'xq-tv-title' }, String(r.symbol || '')),
      el('span', { key: 'p', className: 'xq-tv-pill' }, lb[r.period] || r.period || '日K'),
      el('span', { key: 'n', className: 'xq-tv-pill' }, rows.length + ' 根'),
      rows.length > 1 ? el('span', { key: 'd', className: 'xq-tv-pill' },
        String(first.time || '').slice(0, 10) + ' → ' + String(last.time || '').slice(0, 10)) : null,
      el('span', { key: 'g', className: 'xq-tv-pct ' + (chgPct > 0 ? 'xq-up' : chgPct < 0 ? 'xq-down' : ''), style: { marginLeft: 'auto' } },
        fmt(last.close) + '  ' + (chgPct >= 0 ? '+' : '') + chgPct.toFixed(2) + '%')
    ]),
    el(KlineChart, { key: 'c' + rows.length, symbol: String(r.symbol || ''), rows: rows })
  ])
}

function HotCard(props) {
  const block = props.block
  const r = xqParseResult(block)
  if (!r) return el('div', { className: 'xq-tv-shell' }, block && block.kind ? '结果不可读' : '查询中…')
  const list = Array.isArray(r.list) ? r.list : []
  if (!list.length) return el('div', { className: 'xq-tv-shell' }, '无热榜数据')
  const mk = HOT_MARKET_LABELS
  return el('div', { className: 'xq-tv-shell' }, [
    el('div', { key: 'h', className: 'xq-tv-head' }, [
      el('span', { key: 't', className: 'xq-tv-title' }, '雪球热榜'),
      el('span', { key: 'm', className: 'xq-tv-pill' }, mk[r.market] || r.market || 'A股'),
      el('span', { key: 'n', className: 'xq-tv-pill' }, list.length + ' 只')
    ]),
    el('div', { key: 'b', className: 'xq-tv-table' }, list.map(function (h, i) {
      const up = Number(h.percent) > 0, dn = Number(h.percent) < 0
      const rc = Number(h.rank_change)
      return el('div', { key: h.symbol || i, className: 'xq-tv-row' }, [
        el('span', { key: 'r', className: 'xq-tv-rank' }, String(i + 1)),
        el('span', { key: 'n', className: 'xq-tv-name' }, [
          String(h.name || ''),
          el('span', { key: 'c', className: 'xq-tv-code' }, ' ' + String(h.symbol || ''))
        ]),
        rc > 0 ? el('span', { key: 'rc', className: 'xq-tv-rankup', title: '热度排名上升' }, '↑' + rc) :
          rc < 0 ? el('span', { key: 'rc', className: 'xq-tv-rankdn', title: '热度排名下降' }, '↓' + (-rc)) : null,
        el('span', { key: 'p', className: 'xq-tv-price ' + (up ? 'xq-up' : dn ? 'xq-down' : '') }, fmt(h.current)),
        el('span', { key: 'g', className: 'xq-tv-pct ' + (up ? 'xq-up' : dn ? 'xq-down' : '') },
          fmtPct(h.percent))
      ])
    }))
  ])
}

function NewsCard(props) {
  const block = props.block
  const r = xqParseResult(block)
  if (!r) return el('div', { className: 'xq-tv-shell' }, block && block.kind ? '结果不可读' : '查询中…')
  const items = Array.isArray(r.items) ? r.items : []
  if (!items.length) return el('div', { className: 'xq-tv-shell' }, '无快讯')
  return el('div', { className: 'xq-tv-shell' }, [
    el('div', { key: 'h', className: 'xq-tv-head' }, [
      el('span', { key: 't', className: 'xq-tv-title' }, '雪球快讯'),
      el('span', { key: 'n', className: 'xq-tv-pill' }, items.length + ' 条')
    ]),
    el('div', { key: 'b', className: 'xq-tv-news' }, items.map(function (n, i) {
      const t = String(n.time || '')
      return el('div', { key: n.id || i, className: 'xq-tv-item' + (n.mark === 1 ? ' xq-tv-mark' : '') }, [
        el('span', { key: 'tm', className: 'xq-tv-time' }, t.slice(11, 16) || t.slice(5, 16)),
        el('span', { key: 'tx', className: 'xq-tv-text' }, [
          n.mark === 1 ? el('b', { key: 'm', className: 'xq-tv-flag' }, '重要 ') : null,
          String(n.text || '')
        ])
      ])
    }))
  ])
}

// 登录框（可选：粘贴浏览器 Cookie 启用云端自选股）。
// 提到模块作用域后不再靠闭包读父级 state —— 全部经显式上下文 p 传入：
//   p.login / p.cookieInput / p.setCookieInput / p.loginMsg / p.loginBusy
//   p.doLogin / p.doLogout / p.doPull / p.setLoginOpen / p.setLoginMsg

function LoginBox(p) {
  const loggedIn = !!(p.login && p.login.loggedIn)
  return el('div', { className: 'xq-login' }, [
    el('div', { key: 'hd', className: 'xq-login-hd' }, loggedIn ? '雪球账号 · 已登录' : '登录雪球（可选）'),
    loggedIn
      ? el('div', { key: 'u', className: 'xq-login-user' }, [
          '当前账号：', el('b', { key: 'b' }, p.login.screenName || ('uid ' + (p.login.uid || '?'))),
          el('span', { key: 'c', className: 'xq-acc-mark' }, ' · 云端自选股已启用，加/删自选双端同步（云端为准）')
        ])
      : el('div', { key: 'tip', className: 'xq-login-tip' }, [
          '不登录也能用（匿名模式，自选股存本地）。登录后可直接使用', el('b', { key: 'b' }, '你在雪球的云端自选股'),
          el('ol', { key: 'ol' }, [
            el('li', { key: '1' }, ['浏览器打开 ', el('a', { key: 'a', href: 'https://xueqiu.com', target: '_blank', rel: 'noreferrer' }, 'xueqiu.com'), ' 并登录']),
            el('li', { key: '2' }, 'F12 开发者工具 → Network → 刷新页面，任选一个 xueqiu.com 请求'),
            el('li', { key: '3' }, 'Request Headers 里找到 Cookie: 一行，整行复制粘贴到下面'),
            el('li', { key: '4' }, 'Cookie 仅保存在本机插件目录，不上传任何第三方')
          ])
        ]),
    p.login && p.login.expired
      ? el('div', { key: 'ex', className: 'xq-login-msg xq-login-bad' }, 'Cookie 已过期，请按上面步骤重新获取')
      : null,
    loggedIn ? null : el('textarea', {
      key: 'ta',
      placeholder: '粘贴 Cookie 整行，例如 xq_a_token=...; xq_id_token=...; u=...; device_id=...',
      value: p.cookieInput,
      onChange: function (e) { p.setCookieInput(e.target.value) }
    }),
    p.loginMsg ? el('div', { key: 'msg', className: 'xq-login-msg ' + (p.loginMsg.ok ? 'xq-login-ok' : 'xq-login-bad') }, p.loginMsg.text) : null,
    el('div', { key: 'row', className: 'xq-login-row' }, [
      loggedIn
        ? el('button', { key: 'pull', className: 'xq-btn', disabled: p.loginBusy, onClick: p.doPull }, '同步云端自选')
        : el('button', { key: 'ok', className: 'xq-btn xq-acc-on', disabled: p.loginBusy, onClick: p.doLogin }, p.loginBusy ? '校验中…' : '登录'),
      loggedIn
        ? el('button', { key: 'out', className: 'xq-btn', disabled: p.loginBusy, onClick: p.doLogout }, '退出登录')
        : null,
      el('button', { key: 'close', className: 'xq-btn-mini', disabled: p.loginBusy, onClick: function () { p.setLoginOpen(false); p.setLoginMsg(null) } }, '关闭')
    ])
  ])
}

// 行情 tab：指数卡 + 自选表格（排序 / 闪烁 / 加删自选）。
// 显式上下文 p：
//   p.quotes / p.indices / p.flashDir / p.sortK / p.sortAsc / p.setSortK / p.setSortAsc
//   p.openDetail / p.removeWatch / p.manualCode / p.setManualCode / p.addManual
//   p.alertRules / p.alertDrafts / p.setAlertDrafts / p.setAlert / p.removeAlert / p.alertBusy

function MarketTab(p) {
  const sorted = p.quotes.slice()
  if (p.sortK !== 'default') {
    sorted.sort(function (a, b) {
      const av = Number(a[p.sortK]), bv = Number(b[p.sortK])
      const an = isFinite(av) ? av : -Infinity
      const bn = isFinite(bv) ? bv : -Infinity
      return p.sortAsc ? an - bn : bn - an
    })
  }
  function sortBy(k) {
    if (p.sortK === k) p.setSortAsc(!p.sortAsc)
    else { p.setSortK(k); p.setSortAsc(false) }
  }
  function arrow(k) { return p.sortK === k ? (p.sortAsc ? ' ▲' : ' ▼') : '' }
  function ruleFor(symbol) {
    return (p.alertRules || []).find(function (r) { return r && r.symbol === symbol }) || null
  }
  function draftFor(q) {
    const r = ruleFor(q.symbol)
    const own = p.alertDrafts && p.alertDrafts[q.symbol]
    return own || { direction: r && r.direction === 'below' ? 'below' : 'above', target: r && r.target != null ? String(r.target) : '' }
  }
  function changeDraft(q, patch) {
    const d = draftFor(q)
    p.setAlertDrafts(Object.assign({}, p.alertDrafts || {}, { [q.symbol]: Object.assign({}, d, patch) }))
  }
  function alertEditor(q) {
    const r = ruleFor(q.symbol)
    const d = draftFor(q)
    const busy = p.alertBusy && p.alertBusy[q.symbol]
    return el('div', { key: 'alert', className: 'xq-alert-editor', onClick: function (e) { e.stopPropagation() } }, [
      el('select', { key: 'dir', className: 'xq-alert-dir', value: d.direction, disabled: busy, onChange: function (e) { changeDraft(q, { direction: e.target.value }) } }, [
        el('option', { key: 'a', value: 'above' }, '≥'),
        el('option', { key: 'b', value: 'below' }, '≤')
      ]),
      el('input', { key: 'target', className: 'xq-alert-target', type: 'number', step: 'any', placeholder: '价位', value: d.target, disabled: busy, onChange: function (e) { changeDraft(q, { target: e.target.value }) } }),
      el('button', { key: 'set', className: 'xq-btn-mini', disabled: busy, title: r ? '更新提醒' : '设置提醒', onClick: function () { p.setAlert(q.symbol, d.target, d.direction, true) } }, r ? '更新' : '提醒'),
      r ? el('button', { key: 'rm', className: 'xq-btn-mini', disabled: busy, title: '取消提醒', onClick: function () { p.removeAlert(q.symbol) } }, '取消') : null
    ])
  }
  const idxKids = p.indices.map(function (q) {
    return el('div', {
      key: q.symbol, className: 'xq-idx-card', title: '查看 ' + (q.name || q.symbol) + ' 详情',
      onClick: function () { p.openDetail(q.symbol) }
    }, [
      el('div', { key: 'n', className: 'xq-idx-name' }, q.name),
      el('div', { key: 'r', className: 'xq-idx-row' }, [
        el('span', { key: 'c', className: 'xq-idx-cur ' + colorOf(q.percent) }, fmt(q.current)),
        el('span', { key: 'p', className: 'xq-idx-pct xq-pct-chip ' + colorOf(q.percent) }, fmtPct(q.percent))
      ])
    ])
  })
  const rows = sorted.map(function (q) {
    return el('div', { key: q.symbol, className: 'xq-grid-row', onClick: function () { p.openDetail(q.symbol) } }, [
      el('div', { key: 'n' }, [
        el('div', { key: 'a', className: 'xq-name' }, q.name || q.symbol),
        el('div', { key: 'b', className: 'xq-sub' }, q.symbol)
      ]),
      el('div', { key: 'c', className: colorOf(q.percent) + (p.flashDir[q.symbol] === 1 ? ' xq-flash-up' : p.flashDir[q.symbol] === -1 ? ' xq-flash-down' : '') }, fmt(q.current)),
      el('div', { key: 'p' }, el('span', { key: 'pp', className: 'xq-pct-chip ' + colorOf(q.percent) }, fmtPct(q.percent))),
      el('div', { key: 'v', className: 'xq-sub' }, fmtVol(q.volume, q.symbol)),
      el('div', { key: 'a2', className: 'xq-actions' }, [
        el('button', { key: 'd', className: 'xq-btn-mini', onClick: function (e) { e.stopPropagation(); p.openDetail(q.symbol) } }, '详情'),
        el('button', { key: 'r', className: 'xq-btn-mini', title: '移除自选', onClick: function (e) { e.stopPropagation(); p.removeWatch(q.symbol) } }, '×'),
        alertEditor(q)
      ])
    ])
  })
  return el('div', null, [
    el('div', { key: 'idx', className: 'xq-idx' }, idxKids),
    el('div', { key: 'wl', className: 'xq-grid' }, [
      el('div', { key: 'h', className: 'xq-grid-hd' }, [
        el('span', { key: 'c0' }, '名称'),
        el('span', { key: 'c1', className: 'xq-sort-h' + (p.sortK === 'current' ? ' xq-sort-on' : ''), onClick: function () { sortBy('current') } }, '现价' + arrow('current')),
        el('span', { key: 'c2', className: 'xq-sort-h' + (p.sortK === 'percent' ? ' xq-sort-on' : ''), onClick: function () { sortBy('percent') } }, '涨跌幅' + arrow('percent')),
        el('span', { key: 'c3' }, '成交量'),
        el('span', { key: 'c4' }, '操作')
      ]),
      rows.length ? rows : el('div', { key: 'empty', className: 'xq-grid-row' }, el('span', { key: 'e', className: 'xq-muted' }, '自选股为空，去「搜索」或下方添加'))
    ]),
    el('div', { key: 'add', className: 'xq-search-row' }, [
      el('input', {
        key: 'i', className: 'xq-input', placeholder: '添加代码，如 SH600519 / 00700 / AAPL',
        value: p.manualCode,
        onChange: function (e) { p.setManualCode(e.target.value) },
        onKeyDown: function (e) { if (e.key === 'Enter') p.addManual() }
      }),
      el('button', { key: 'b', className: 'xq-btn', onClick: p.addManual }, '添加')
    ])
  ])
}

// 详情 tab（个股）：报价头 + 统计卡 + 走势（K线/分时）+ 财务 + 热议用户。
// 显式上下文 p：
//   p.detail / p.view / p.setView / p.chartMode / p.setChartMode
//   p.klinePeriod / p.setKlinePeriod / p.fetchEarlierKline

function DetailView(p) {
  if (!p.detail) return el('div', { className: 'xq-loading' }, '加载中…')
  const q = p.detail.quote || {}
  const kl = p.detail.kline || { rows: [] }
  const mn = p.detail.minute || { items: [], last_close: null }
  const fin = p.detail.finance || { list: [] }
  const kol = p.detail.kol || []
  const firstFin = fin.list && fin.list.length ? fin.list[0] : null
  const stats = [
    ['今开', fmt(q.open)], ['昨收', fmt(q.last_close)], ['最高', fmt(q.high)], ['最低', fmt(q.low)],
    ['成交量', fmtVol(q.volume, q.symbol)], ['成交额', fmtBig(q.amount)], ['换手率', fmt(q.turnover_rate) + '%'], ['振幅', fmt(q.amplitude) + '%'],
    ['总市值', fmtBig(q.market_capital)], ['流通市值', fmtBig(q.float_market_capital)], ['量比', fmt(q.volume_ratio)], ['PE(TTM)', fmt(q.pe_ttm)],
    ['PB', fmt(q.pb)], ['股息率', fmt(q.dividend_yield) + '%'], ['52周高', fmt(q.high52w)], ['52周低', fmt(q.low52w)]
  ]
  const finStats = firstFin ? [
    ['ROE', fmt(firstFin.avg_roe) + '%'], ['EPS', fmt(firstFin.basic_eps)],
    ['毛利率', fmt(firstFin.gross_selling_rate) + '%'], ['净利率', fmt(firstFin.net_selling_rate) + '%'],
    ['营收同比', fmt(firstFin.operating_income_yoy) + '%'], ['净利同比', fmt(firstFin.net_profit_atsopc_yoy) + '%'],
    ['资产负债率', fmt(firstFin.asset_liab_ratio) + '%'], ['每股现金流', fmt(firstFin.operate_cash_flow_ps)]
  ] : []
  const kolKids = kol.map(function (u) {
    return el('span', { key: u.id, className: 'xq-kol-chip' }, [
      u.screen_name || ('用户' + u.id),
      u.verified ? el('span', { key: 'v', className: 'xq-verif' }, '✓') : null,
      ' · ' + fmtBig(u.followers_count) + '粉'
    ])
  })
  // 行情主标题：现价 + 涨跌额 + 涨跌幅（参考雪球 ¥18.23 +0.14 +0.77% 层级）
  // 精度取现价自身小数位（港交所 1 位等），涨跌额同精度
  const qDigits = (function () {
    const m = String(q.current == null ? '' : q.current).split('.')
    const d = m[1] ? m[1].length : 0
    return Math.max(2, Math.min(4, d))
  })()
  const chgRaw = (q.current != null && q.last_close != null) ? (Number(q.current) - Number(q.last_close)) : null
  const chgStr = (chgRaw != null && isFinite(chgRaw)) ? (chgRaw > 0 ? '+' + fmt(chgRaw, qDigits) : (chgRaw < 0 ? '-' + fmt(Math.abs(chgRaw), qDigits) : fmt(0, qDigits))) : ''
  const priceCls = colorOf(q.percent)
  return el('div', null, [
    el('div', { key: 'h', className: 'xq-detail-head' }, [
      el('button', { key: 'b', className: 'xq-btn-mini', onClick: function () { p.setView(null) } }, '← 返回'),
      el('span', { key: 'n', className: 'xq-detail-name' }, q.name || p.view),
      el('span', { key: 'c', className: 'xq-detail-code' }, p.view),
      el('span', { key: 'sp', className: 'xq-spacer' }),
      el('div', { key: 'px', className: 'xq-detail-price' }, [
        el('span', { key: 'cur', className: 'xq-detail-cur ' + priceCls }, fmt(q.current, qDigits)),
        el('span', { key: 'dl', className: 'xq-detail-delta' }, [
          chgStr ? el('span', { key: 'chg', className: 'xq-detail-chg ' + priceCls }, chgStr) : null,
          el('span', { key: 'pct', className: 'xq-detail-pct ' + priceCls }, fmtPct(q.percent))
        ])
      ])
    ]),
    el('div', { key: 'st', className: 'xq-stats' }, stats.map(function (s, i) {
      return el('div', { key: i, className: 'xq-stat' }, [
        el('div', { key: 'k', className: 'xq-stat-k' }, s[0]),
        el('div', { key: 'v', className: 'xq-stat-v' }, s[1])
      ])
    })),
    el('div', { key: 'kl', className: 'xq-card' }, [
      el('div', { key: 't', className: 'xq-card-t' }, [
        el('span', { key: 't' }, '走势'),
        el('span', { key: 'modes', className: 'xq-modes' }, [
          el('button', { key: 'k', className: p.chartMode === 'kline' ? 'xq-on' : '', onClick: function () { p.setChartMode('kline') } }, 'K线'),
          el('button', { key: 'm', className: p.chartMode === 'minute' ? 'xq-on' : '', onClick: function () { p.setChartMode('minute') } }, '分时')
        ]),
        el('span', { key: 'sp', className: 'xq-spacer' }),
        p.chartMode === 'kline' ? el('span', { key: 'pd', className: 'xq-periods' }, (function () {
          // 注：内层 map 参数原为 p（与显式上下文参数 p 撞名），改名 k —— 纯改名，行为不变
          const ps = KLINE_PERIODS
          const lb = PERIOD_LABELS
          return ps.map(function (k) {
            return el('button', {
              key: k, className: p.klinePeriod === k ? 'xq-on' : '',
              onClick: function () { p.setKlinePeriod(k) }
            }, lb[k] || k)
          })
        })()) : null
      ]),
      p.chartMode === 'kline'
        ? el(KlineChart, { key: 'k' + p.view + p.klinePeriod, symbol: p.view, period: p.klinePeriod, rows: kl.rows, onNeedEarlier: p.fetchEarlierKline })
        : el(MinuteChart, { key: 'm' + p.view, symbol: p.view, items: mn.items, lastClose: mn.last_close })
    ]),
    firstFin ? el('div', { key: 'fin', className: 'xq-card' }, [
      el('div', { key: 't', className: 'xq-card-t' }, '财务指标 · ' + (firstFin.report_name || '')),
      el('div', { key: 'g', className: 'xq-stats' }, finStats.map(function (s, i) {
        return el('div', { key: i, className: 'xq-stat' }, [
          el('div', { key: 'k', className: 'xq-stat-k' }, s[0]),
          el('div', { key: 'v', className: 'xq-stat-v' }, s[1])
        ])
      }))
    ]) : null,
    kolKids.length ? el('div', { key: 'kol', className: 'xq-card' }, [
      el('div', { key: 't', className: 'xq-card-t' }, '热议用户'),
      el('div', { key: 'l', className: 'xq-kol' }, kolKids)
    ]) : null
  ])
}

// 热榜 tab：市场切换 + 热度榜行。
// 显式上下文 p：
//   p.hot / p.hotMarket / p.setHotMarket / p.hotSeq / p.setHot / p.setErr / p.openDetail

function HotTab(p) {
  const markets = HOT_MARKETS
  return el('div', null, [
    el('div', { key: 'seg', className: 'xq-seg', style: { marginBottom: 8 } }, markets.map(function (m) {
      return el('button', {
        key: m[0], className: p.hotMarket === m[0] ? 'xq-seg-on' : '',
        onClick: function () {
          p.setHotMarket(m[0])
          const my = ++p.hotSeq.current
          call(A_HOT, { market: m[0], size: HOT_LIST_SIZE }).then(function (data) {
            if (p.hotSeq.current !== my) return   // 快速连点：只认最后一次
            p.setHot((data && data.list) || [])
          }).catch(function (e) {
            if (p.hotSeq.current !== my) return
            p.setErr(String((e && e.message) || e))
          })
        }
      }, m[1])
    })),
    el('div', { key: 'list', className: 'xq-grid' }, p.hot.map(function (it, i) {
      return el('div', { key: it.symbol, className: 'xq-hot-row', onClick: function () { p.openDetail(it.symbol) } }, [
        el('span', { key: 'r', className: 'xq-rank' }, String(i + 1)),
        el('div', { key: 'n' }, [
          el('div', { key: 'a', className: 'xq-name' }, it.name),
          el('div', { key: 'b', className: 'xq-sub' }, it.symbol)
        ]),
        el('span', { key: 'sp', className: 'xq-spacer' }),
        el('span', { key: 'c', className: colorOf(it.percent) }, fmt(it.current)),
        el('span', { key: 'p', className: colorOf(it.percent) }, fmtPct(it.percent)),
        el('button', { key: 'd', className: 'xq-btn-mini', onClick: function (e) { e.stopPropagation(); p.openDetail(it.symbol) } }, '详情')
      ])
    }))
  ])
}

// 搜索 tab：股票 / 帖子两种模式（doSearch 的数据逻辑仍在父组件，经 p 传入）。
// 显式上下文 p：
//   p.searchQ / p.setSearchQ / p.searchMode / p.setSearchMode / p.searchRes / p.setSearchRes
//   p.searching / p.doSearch / p.openDetail / p.addWatch

function SearchTab(p) {
  const isPost = p.searchMode === 'post'
  const resKids = p.searchRes.map(function (r) {
    const title = isPost ? (r.title || '') : r.name
    const sub = isPost ? ((r.user ? r.user.screen_name + ' · ' : '') + fmtBig(r.view_count) + '阅读') : (r.code || '')
    const desc = isPost ? String(r.text || '').slice(0, 60) : sub
    return el('div', { key: String(r.id || r.code), className: 'xq-grid-row' }, [
      el('div', { key: 'n' }, [
        el('div', { key: 'a', className: 'xq-name' }, title || '（无标题）'),
        el('div', { key: 'b', className: 'xq-sub' }, desc)
      ]),
      el('div', { key: 'c', className: 'xq-sub' }, sub),
      el('div', { key: 'p', className: 'xq-sub' }, isPost ? fmtDay(r.created_at) : ''),
      el('div', { key: 'a2', className: 'xq-actions' }, isPost
        ? null
        : [
          el('button', { key: 'd', className: 'xq-btn-mini', onClick: function () { p.openDetail(r.code) } }, '详情'),
          el('button', { key: 'w', className: 'xq-btn-mini', onClick: function () { p.addWatch(r.code) } }, '加自选')
        ])
    ])
  })
  return el('div', null, [
    el('div', { key: 'row', className: 'xq-search-row' }, [
      el('input', {
        key: 'i', className: 'xq-input', placeholder: p.searchMode === 'stock' ? '搜索股票，如「茅台」' : '搜索帖子，如「段永平」',
        value: p.searchQ,
        onChange: function (e) { p.setSearchQ(e.target.value) },
        onKeyDown: function (e) { if (e.key === 'Enter') p.doSearch() }
      }),
      el('button', { key: 'b', className: 'xq-btn', disabled: p.searching, onClick: p.doSearch }, p.searching ? '搜索中…' : '搜索')
    ]),
    el('div', { key: 'seg', className: 'xq-seg', style: { marginBottom: 8 } }, [
      el('button', { key: 's', className: p.searchMode === 'stock' ? 'xq-seg-on' : '', onClick: function () { p.setSearchMode('stock'); p.setSearchRes([]) } }, '股票'),
      el('button', { key: 'p', className: p.searchMode === 'post' ? 'xq-seg-on' : '', onClick: function () { p.setSearchMode('post'); p.setSearchRes([]) } }, '帖子')
    ]),
    p.searchRes.length ? el('div', { key: 'res', className: 'xq-grid' }, [
      el('div', { key: 'h', className: 'xq-grid-hd' }, ['结果', '', '', ''].map(function (t, i) { return el('span', { key: i }, t) })),
      resKids
    ]) : el('div', { key: 'tip', className: 'xq-muted' }, '输入关键词搜索，回车或点搜索')
  ])
}

// 快讯 tab：时间轴分组（今天/昨天/M月D日）+ 滚动到底加载更早。
// 显式上下文 p：
//   p.news / p.newsMore / p.newsNoMore / p.loadMoreNews

function NewsTab(p) {
  // 时间轴：按「今天/昨天/M月D日」分组，每组一个锚点头
  const kids = []
  let lastDay = null
  p.news.forEach(function (it) {
    const d = new Date(it.created_at)
    const now = new Date()
    if (isNaN(d.getTime())) {   // 脏/缺失时间：跳过分组头（否则渲染 "NaN月NaN日"）
      kids.push(el('div', { key: String(it.id), className: 'xq-news-item' + (it.mark === 1 ? ' xq-important' : '') }, [
        el('div', { key: 't' }, it.text),
        el('div', { key: 'm', className: 'xq-news-time' }, fmtTime(it.created_at) + (it.mark === 1 ? ' · 重要' : ''))
      ]))
      return
    }
    const sameDay = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
    const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    let label = null
    const dayKey = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()
    if (dayKey !== lastDay) {
      lastDay = dayKey
      label = sameDay(d, now) ? '今天' : (sameDay(d, yest) ? '昨天' : (d.getMonth() + 1) + '月' + d.getDate() + '日')
    }
    if (label) kids.push(el('div', { key: 'g' + dayKey, className: 'xq-news-group' }, label))
    kids.push(el('div', { key: String(it.id), className: 'xq-news-item' + (it.mark === 1 ? ' xq-important' : '') }, [
      el('div', { key: 't' }, it.text),
      el('div', { key: 'm', className: 'xq-news-time' }, fmtTime(it.created_at) + (it.mark === 1 ? ' · 重要' : ''))
    ]))
  })
  // 滚动到底自动加载；手动入口兜底（滚轮惯性/触控板场景）
  kids.push(el('div', {
    key: 'more',
    className: 'xq-news-more',
    onClick: function () { p.loadMoreNews() }
  }, p.newsMore ? '加载中…' : (p.newsNoMore ? '没有更早的快讯了' : '加载更早 ↑')))
  return p.news.length
    ? el('div', {
        className: 'xq-news xq-news-tl',
        onScroll: function (e) {
          const n = e.target
          if (n.scrollTop + n.clientHeight >= n.scrollHeight - 40) p.loadMoreNews()
        }
      }, kids)
    : el('div', { className: 'xq-muted' }, '暂无快讯')
}

// 今日盈亏：面板头部常驻 chip + 「盈亏」tab。
//
// 口径（改造后）：
//   今日盈亏 = Σ(现价 − 昨收) × 股数       —— 由**本地持仓 × 雪球行情**现算，不碰账本
//   当日涨跌幅 = 今日盈亏 / Σ(昨收 × 股数)
// 与账本账户口径的差别：不含当日已实现与费用（账本那个数只在「从账本同步」时取一次，存在持仓 tab）。
//
// 展示口径沿用 dsh-ths-pnl 的客户端实现：金额带符号 + 千分位 + 两位小数，百分比两位小数；
// 涨跌按 **A 股习惯（涨=红、跌=绿）** —— 与雪球页面一致，但与欧美习惯相反。

// 带符号千分位两位小数（金额）。不用 toFixed 是为了千分位分组。
function fmtYk(value) {
  const n = Number(value) || 0
  const sign = n > 0 ? '+' : (n < 0 ? '-' : '')
  return sign + Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 无符号千分位两位小数（市值 / 成本这类「量」）。
function fmtMoney(value) {
  const n = Number(value)
  if (!isFinite(n)) return '--'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 涨跌配色类（A 股：涨红跌绿）。
function trendClass(value) {
  const n = Number(value)
  if (!isFinite(n) || n === 0) return ''
  return n > 0 ? 'xq-pnl-up' : 'xq-pnl-down'
}

// 时段文案。盘外时段（盘前/午间/收盘/休市）要显式标出来，否则用户会以为数字停住是坏了。
const SESSION_TEXT = { pre: '盘前', morning: '盘中', lunch: '午间', afternoon: '盘中', after: '收盘', weekend: '休市' }
const OFF_HOURS = { pre: 1, lunch: 1, after: 1, weekend: 1 }

/**
 * 订阅持仓/盈亏视图。返回 state 快照；订阅/退订由 store 的引用计数管轮询器的启停，
 * 所以 chip、两个 tab、底部指数条同时挂着也只有一个轮询器、一份数据。
 * 导出给底部指数条（client/ticker.js）复用：那里也要判断「有没有东西可显示」。
 */
function usePnlState() {
  return usePositionsState()
}

// 头部常驻 chip：一行小字展示今日盈亏，点击切到「盈亏」tab。
function PnlChip() {
  const state = usePnlState()
  const data = state.data
  // totals 可能缺（宿主异常 / 老版本视图）：用空对象兜底，宁可显示 -- 也不能把整块 chip 崩掉。
  const totals = (data && data.totals) || {}

  let label
  let cls = 'xq-pnl-dim'
  let tag = ''
  if (state.status === 'error') {
    label = '今日盈亏 数据异常'
  } else if (!data) {
    label = '今日盈亏 …'
  } else if (!data.rows || data.rows.length === 0) {
    label = '今日盈亏 未录持仓'
  } else if (totals.day_profit === null || totals.day_profit === undefined) {
    // 有持仓但一行行情都没取到：不摆 0，也不摆占位符之外的假数字
    label = '今日盈亏 行情未到'
    tag = '待刷新'
  } else {
    label = '今日 ' + fmtYk(totals.day_profit) + ' (' + fmtPct(totals.day_rate) + ')'
    cls = trendClass(totals.day_profit) || 'xq-pnl-dim'
    tag = OFF_HOURS[data.session] ? (SESSION_TEXT[data.session] || '') : ''
  }

  let title = '今日盈亏 = Σ(现价 − 昨收) × 股数（本地持仓 × 雪球行情，点击查看盈亏页）'
  if (data && data.as_of) title += '\n行情时间：' + new Date(data.as_of).toLocaleString('zh-CN')
  if (data && OFF_HOURS[data.session]) title += '\n非交易时段 · 显示的是最近一次行情'
  if (data && data.rows && data.rows.length === 0) title += '\n还没有持仓：去「持仓」tab 录入，或从账本同步一次'
  if (totals && totals.missing > 0) {
    title += '\n有 ' + totals.missing + ' 只取不到现价，合计不完整'
  }
  if (data && totals && totals.day_base) {
    title += '\n当日涨跌幅 = 今日盈亏 ÷ Σ(昨收 × 股数)，与「市值」不是同一个分母'
  }
  title += '\n不含当日已实现与费用（账本账户口径在「持仓」tab 的同步区）'
  if (state.status === 'error' && state.error) title += '\n' + state.error

  const kids = [el('span', { key: 'v' }, label)]
  if (tag) kids.push(el('span', { key: 'tag', className: 'xq-pnl-tag' }, tag))

  return el('span', {
    className: 'xq-pnl-chip ' + cls,
    title: title,
    onClick: function () {
      const ui = getUiRuntime()
      if (ui) ui.ui.set({ tab: 'pnl', open: true })
    }
  }, kids)
}

/**
 * 「盈亏」tab：大字盈亏 + 口径说明 + 数据源状态 + 行情刷新间隔。
 *
 * 账本的 Cookie / 组合不在这里 —— 它们只服务「从账本同步」，放在「持仓」tab 的同步区，
 * 免得用户以为「今日盈亏还得配 Cookie」。
 */
function PnlTab(p) {
  const state = usePnlState()
  const data = state.data
  const totals = (data && data.totals) || {}
  const [busy, setBusy] = React.useState(false)
  const [intervalDraft, setIntervalDraft] = React.useState('')
  const [msg, setMsg] = React.useState(null)

  // 打开本 tab 时取一次宿主设置（刷新间隔 + 边界值），顺便读一下账本同步状态。
  React.useEffect(function () {
    let alive = true
    call(A_PNL_VERIFY, {}).then(function (d) {
      if (!alive || !d) return
      if (isFinite(Number(d.poll_ms)) && Number(d.poll_ms) > 0) setIntervalDraft(String(Number(d.poll_ms) / 1000))
    }).catch(function () { /* 未配置凭据时宿主会报错，这里静默：本 tab 不依赖凭据 */ })
    return function () { alive = false }
  }, [])

  function saveInterval() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    call(A_PNL_CONFIG, { pollSec: intervalDraft }).then(function (json) {
      setMsg({ ok: true, text: '行情刷新间隔已设为 ' + json.poll_sec + ' 秒' })
      if (isFinite(Number(json.poll_sec))) setIntervalDraft(String(json.poll_sec))
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  // ---- 大字区：金额 + 涨跌幅 + 时段 ----
  let amountText
  let amountCls = 'xq-pnl-dim'
  let subText = ''
  let subBad = false
  let hasValue = false
  const hasRows = data && data.rows && data.rows.length > 0
  if (state.status === 'error') {
    amountText = '--'
    subText = '数据异常：' + state.error
    subBad = true
  } else if (!data) {
    amountText = '…'
    subText = '加载中…'
  } else if (!hasRows) {
    amountText = '未录持仓'
    subText = '去「持仓」tab 手工录入，或在那边点一次「从账本同步」'
  } else if (totals.day_profit === null || totals.day_profit === undefined) {
    amountText = '--'
    subText = '雪球行情没取到，稍后自动重试（持仓数据不受影响）'
    subBad = true
  } else {
    amountText = fmtYk(totals.day_profit)
    amountCls = trendClass(totals.day_profit) || 'xq-pnl-dim'
    hasValue = true
  }
  const sessionText = data && SESSION_TEXT[data.session] ? SESSION_TEXT[data.session] : ''
  const hero = el('div', { className: 'xq-pnl-hero' }, [
    el('span', { key: 'a', className: 'xq-pnl-amt ' + amountCls }, amountText),
    hasValue ? el('span', { key: 'p', className: 'xq-pnl-pct ' + amountCls }, fmtPct(totals.day_rate)) : null,
    sessionText ? el('span', { key: 's', className: 'xq-pnl-tag' }, sessionText) : null
  ])

  // ---- 次级统计 ----
  const stats = [
    ['持仓盈亏', hasRows && totals.hold_profit !== null ? fmtYk(totals.hold_profit) : '--',
      hasRows && totals.hold_rate !== null ? fmtPct(totals.hold_rate) : '', hasRows ? totals.hold_profit : null],
    ['持仓市值', hasRows ? fmtMoney(totals.value) : '--', '', null],
    ['持仓成本', hasRows ? fmtMoney(totals.cost_value) : '--', '', null],
  ].map(function (it, i) {
    return el('div', { key: 's' + i, className: 'xq-stat' }, [
      el('div', { key: 'k', className: 'xq-stat-k' }, it[0]),
      el('div', { key: 'v', className: 'xq-pos-num ' + (it[3] === null ? '' : (trendClass(it[3]) || '')) },
        it[2] ? (it[1] + ' ' + it[2]) : it[1])
    ])
  })

  const metaParts = []
  if (hasRows) metaParts.push('共 ' + totals.held + ' 只计入合计')
  if (totals && totals.missing > 0) metaParts.push(totals.missing + ' 只缺现价')
  if (data && data.as_of) metaParts.push('行情 ' + new Date(data.as_of).toLocaleString('zh-CN'))
  if (data && isFinite(Number(data.poll_ms))) metaParts.push('刷新间隔 ' + Math.round(Number(data.poll_ms) / 1000) + ' 秒')
  const meta = metaParts.length ? el('div', { className: 'xq-pnl-meta' }, metaParts.join(' · ')) : null

  const intervalRow = el('div', { className: 'xq-pnl-field' }, [
    el('label', { key: 'l' }, '行情刷新间隔'),
    el('input', {
      key: 'i', className: 'xq-pnl-num', type: 'number', min: '5', max: '3600', step: '1',
      value: intervalDraft,
      onChange: function (e) { setIntervalDraft(e.target.value) },
      onKeyDown: function (e) { if (e.key === 'Enter') saveInterval() }
    }),
    el('span', { key: 'u', className: 'xq-pnl-note' }, '秒（5–3600）：盘中按这个节奏刷新行情，盘外自动睡到下一个 09:30/13:00/15:00'),
    el('button', { key: 'b', className: 'xq-btn', disabled: busy, onClick: saveInterval }, busy ? '保存中…' : '保存')
  ])
  const msgEl = msg ? el('div', { key: 'm', className: 'xq-pnl-msg' }, [
    el('span', { key: 'v', className: msg.ok ? 'xq-pnl-ok' : 'xq-pnl-bad' }, (msg.ok ? '✓ ' : '✗ ') + msg.text)
  ]) : null

  const cloud = (data && data.cloud) || null
  const cloudNote = cloud
    ? (cloud.synced_at
      ? '上次从账本同步：' + new Date(cloud.synced_at).toLocaleString('zh-CN')
        + (cloud.account && cloud.account.pnl_yk !== undefined ? '（账户口径今日盈亏 ' + fmtYk(cloud.account.pnl_yk) + '）' : '')
      : '还没成功同步过账本')
    : '还没从账本同步过'

  const notes = [
    el('div', { key: 'n1', className: 'xq-pnl-note' },
      '今日盈亏 = Σ(现价 − 昨收) × 股数，全部由「本地持仓 × 雪球行情」现算，不再向账本要数 —— ' +
      '账本凭据过期也不会让这里的数字停摆。'),
    el('div', { key: 'n2', className: 'xq-pnl-note' },
      '口径差别：本页是「持仓浮动」，不含当日已实现盈亏与费用；账本账户口径含这两项，' +
      '所以两者会差一点（清仓那部分尤其明显）。' + cloudNote + '。'),
    el('div', { key: 'n3', className: 'xq-pnl-note' },
      '持仓的增删改与「从账本同步」都在「持仓」tab；同步只在你自己点的时候发生。')
  ]

  return el('div', { className: 'xq-pnl' }, [hero, el('div', { key: 'st', className: 'xq-pos-stats' }, stats), meta, intervalRow, msgEl].concat(notes))
}

// 「持仓」tab：**本地持仓**（主数据）的查看、手工增删改，以及「从账本同步」。
//
// 定位（改造后）：持仓是本地文件里的一份可编辑数据；价格与盈亏由雪球行情现算（宿主算，
// 见 lib/pnl/index.js）。这里的股数与成本价就是「输入」—— 改完立即反映到今日盈亏。
//
// 账本只有两个入口，都在本 tab 的「从账本同步」区里，且**只在用户点击时**才发请求：
//   · 导入 / 校对（merge）：账本有则更新 qty/cost，账本没有的本地行保留；
//   · 用账本覆盖（replace）：整表以账本为准。
// 同步失败（Cookie 过期 / 403 / 断网）只影响这个按钮的结果，**持仓与今日盈亏照常**。
//
// 本组件自取运行时（usePositionsState），不读父级任何上下文字段：
// panel/index.js 的 TAB_CTX.positions 返回空对象即可。

/** 金额：无符号 + 千分位 + 两位小数。 */
function money(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 金额：带符号 + 千分位（盈亏用）。 */
function signedMoney(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  const sign = n > 0 ? '+' : (n < 0 ? '-' : '')
  return sign + Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 股数：整数 + 千分位（A 股 1 手 = 100 股，这里显示的是**股数**）。 */
function qtyText(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

/** 价格：低价品种（ETF/基金/港股）保留三位小数，其余两位。 */
function priceText(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!isFinite(n)) return '--'
  return Math.abs(n) < 10 ? n.toFixed(3) : n.toFixed(2)
}

function rateText(v) {
  if (v === null || v === undefined) return ''
  const n = Number(v)
  if (!isFinite(n)) return ''
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

/**
 * 涨跌单元：金额在上、涨跌幅在下，颜色由**涨跌方向**决定（A 股习惯：涨红跌绿，见 styles.css
 * 的 .xq-up/.xq-down/.xq-flat）。金额与涨跌幅都取不到时显示 `--`，不假装是 0。
 */
function changeCell(profit, rate, showRate, title) {
  const hasAmount = profit !== null && profit !== undefined && isFinite(Number(profit))
  const rateTxt = showRate ? rateText(rate) : ''
  if (!hasAmount && !rateTxt) {
    return el('span', { className: 'xq-pos-r xq-pos-num xq-pos-chg xq-flat', title: title }, '--')
  }
  return el('span', { className: 'xq-pos-r xq-pos-num xq-pos-chg ' + colorOf(hasAmount ? profit : rate), title: title }, [
    el('span', { key: 'a', className: 'xq-pos-amt' }, hasAmount ? signedMoney(profit) : '--'),
    rateTxt ? el('span', { key: 'b', className: 'xq-pos-rate' }, rateTxt) : null
  ])
}

/** 时间戳 → 「MM-DD HH:mm」；取不到给空串。 */
function stampText(iso) {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (!isFinite(t)) return ''
  const d = new Date(t)
  function p(n) { return n < 10 ? '0' + n : String(n) }
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

const BLANK_FORM = { code: '', name: '', qty: '', cost: '' }

// 「持仓」tab：合计 + 可编辑的逐只持仓表 + 从账本同步区。
function PositionsTab(p) {
  const state = usePositionsState()
  const data = state.data
  const totals = (data && data.totals) || {}

  const [form, setForm] = React.useState(null)       // null = 表单关闭；否则 {code,name,qty,cost}
  const [originalCode, setOriginalCode] = React.useState('')  // 编辑时原代码（改代码用）
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState(null)         // { ok, text }
  const [syncOpen, setSyncOpen] = React.useState(false)
  const [cookieDraft, setCookieDraft] = React.useState('')
  const [book, setBook] = React.useState(null)       // pnl.verify 的结果（凭据 / 组合 / 上次同步）

  // 打开同步区时才去校验凭据（不打开就一次账本请求都不发 —— 连校验都不做）
  React.useEffect(function () {
    if (!syncOpen) return function () { }
    let alive = true
    call(A_PNL_VERIFY, {}).then(function (d) {
      if (alive && d) setBook(d)
    }).catch(function (e) {
      if (alive) setBook({ configured: false, valid: false, error: String((e && e.message) || e), portfolios: [], fundKey: '' })
    })
    return function () { alive = false }
  }, [syncOpen])

  function openAdd() {
    setMsg(null)
    setOriginalCode('')
    setForm(Object.assign({}, BLANK_FORM))
  }
  function openEdit(row) {
    setMsg(null)
    setOriginalCode(row.code)
    setForm({ code: row.code, name: row.name || '', qty: row.qty === null ? '' : String(row.qty), cost: row.cost === null ? '' : String(row.cost) })
  }
  function closeForm() { setForm(null); setOriginalCode('') }

  function submit() {
    if (busy || !form) return
    const rt = getPositionsRuntime()
    if (!rt) return
    setBusy(true)
    rt.save({ code: form.code, name: form.name, qty: form.qty, cost: form.cost === '' ? null : form.cost }, originalCode || undefined).then(function () {
      setMsg({ ok: true, text: originalCode ? '已保存 ' + String(form.code).toUpperCase() : '已添加 ' + String(form.code).toUpperCase() })
      closeForm()
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  function removeRow(row) {
    const rt = getPositionsRuntime()
    if (!rt || busy) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('从持仓里删除 ' + (row.name || row.code) + '？')) return
    setBusy(true)
    rt.remove(row.code).then(function () {
      setMsg({ ok: true, text: '已删除 ' + (row.name || row.code) })
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  function refreshNow() {
    const rt = getPositionsRuntime()
    if (!rt || busy) return
    setBusy(true)
    rt.refresh(true).then(function () { setBusy(false) })
  }

  // ---- 账本同步 ----
  function saveCookie() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    call(A_PNL_CONFIG, { cookie: cookieDraft.trim() }).then(function (json) {
      setBook(json)
      setCookieDraft('')
      setMsg({ ok: Boolean(json.valid), text: json.valid ? ('账本 Cookie 有效，' + (json.portfolios || []).length + ' 个组合') : ('校验失败：' + (json.error || '未知原因')) })
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  function chooseFund(key) {
    if (busy) return
    setBusy(true)
    call(A_PNL_CONFIG, { fundKey: key }).then(function (json) {
      setBook(function (prev) { return Object.assign({}, prev || {}, { fundKey: json.fundKey, valid: prev ? prev.valid : false, portfolios: (prev && prev.portfolios) || [] }) })
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  function doSync(mode) {
    const rt = getPositionsRuntime()
    if (!rt || busy) return
    if (mode === 'replace' && typeof window !== 'undefined' && window.confirm
      && !window.confirm('用账本覆盖本地全部持仓？手工录入的行会被清掉。')) return
    setBusy(true)
    setMsg(null)
    rt.sync(mode).then(function (res) {
      if (res && res.ok) {
        const rep = res.report || {}
        const parts = ['新增 ' + (rep.added || []).length, '更新 ' + (rep.updated || []).length]
        if ((rep.kept || []).length) parts.push('本地保留 ' + rep.kept.length)
        if ((rep.cleared || []).length) parts.push('已清仓 ' + rep.cleared.length)
        setMsg({ ok: true, text: '同步完成：' + parts.join(' · ') })
      } else {
        setMsg({ ok: false, text: '同步失败（持仓与盈亏不受影响）：' + ((res && res.error) || '未知原因') })
      }
    }).catch(function (e) {
      setMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setBusy(false) })
  }

  if (!data) {
    return el('div', { className: 'xq-loading' },
      state.status === 'error' ? ('持仓加载失败：' + state.error) : '持仓加载中…')
  }

  const rows = (Array.isArray(data.rows) ? data.rows.slice() : []).sort(function (a, b) {
    return (Number(b.value) || 0) - (Number(a.value) || 0)
  })

  // ---- 合计 ----
  const stats = [
    ['今日盈亏', data.rows.length ? signedMoney(totals.day_profit) : '--', data.rows.length ? rateText(totals.day_rate) : '',
      data.rows.length ? totals.day_profit : null],
    ['持仓盈亏', rows.length ? signedMoney(totals.hold_profit) : '--', rows.length ? rateText(totals.hold_rate) : '', rows.length ? totals.hold_profit : null],
    ['持仓市值', rows.length ? money(totals.value) : '--', '', null],
    ['持仓成本', rows.length ? money(totals.cost_value) : '--', '', null],
  ].map(function (it, i) {
    const cls = it[3] === null || it[3] === undefined ? '' : (colorOf(it[3]) || '')
    return el('div', { key: 's' + i, className: 'xq-stat' }, [
      el('div', { key: 'k', className: 'xq-stat-k' }, it[0]),
      el('div', { key: 'v', className: 'xq-pos-num ' + cls }, it[2] ? (it[1] + ' ' + it[2]) : it[1])
    ])
  })

  // ---- 表单（新增 / 编辑共用）----
  function field(key, label, placeholder, type) {
    return el('label', { key: key, className: 'xq-pos-field' }, [
      el('span', { key: 'l', className: 'xq-pos-field-k' }, label),
      el('input', {
        key: 'i', className: 'xq-pos-input', type: type || 'text', placeholder: placeholder,
        value: form[key],
        onChange: function (e) {
          const v = e.target.value
          setForm(function (prev) { const next = Object.assign({}, prev); next[key] = v; return next })
        },
        onKeyDown: function (e) { if (e.key === 'Enter') submit() }
      })
    ])
  }
  const formEl = form ? el('div', { key: 'form', className: 'xq-pos-form' }, [
    el('div', { key: 'hd', className: 'xq-pos-form-hd' }, originalCode ? ('编辑 ' + originalCode) : '添加持仓'),
    el('div', { key: 'f', className: 'xq-pos-form-row' }, [
      field('code', '代码', '600519 / 00700 / AAPL'),
      field('name', '名称（可空）', '留空自动按代码取'),
      field('qty', '股数', '100', 'number'),
      field('cost', '成本价（可空）', '摊薄成本', 'number'),
    ]),
    el('div', { key: 'bt', className: 'xq-pos-form-btns' }, [
      el('button', { key: 'ok', className: 'xq-btn', disabled: busy, onClick: submit }, busy ? '保存中…' : '保存'),
      el('button', { key: 'no', className: 'xq-btn', disabled: busy, onClick: closeForm }, '取消'),
      el('span', { key: 'hint', className: 'xq-pnl-note' }, '代码唯一；港股填 00700 或 HK00700 都行。只输代码+股数也能用，成本价留空则「持仓盈亏」显示 --。')
    ])
  ]) : null

  // ---- 表头 / 表体 ----
  const head = el('div', { key: 'hd', className: 'xq-pos-grid xq-pos-hd' }, [
    el('span', { key: 'n' }, '名称 / 代码'),
    el('span', { key: 'q', className: 'xq-pos-r', title: '股数' }, '股数'),
    el('span', { key: 'c', className: 'xq-pos-r', title: '持仓成本价（摊薄成本）' }, '成本价'),
    el('span', { key: 'p', className: 'xq-pos-r' }, '现价'),
    el('span', { key: 'd', className: 'xq-pos-r', title: '当日盈亏 / 当日涨跌幅 =（现价 − 昨收）× 股数' }, '当日盈亏'),
    el('span', { key: 'v', className: 'xq-pos-r' }, '市值'),
    el('span', { key: 'y', className: 'xq-pos-r', title: '持仓盈亏 / 持仓收益率（相对成本价）' }, '持仓盈亏'),
    el('span', { key: 'o', className: 'xq-pos-r' }, '操作')
  ])

  const body = rows.map(function (row, i) {
    const hasQty = row.qty !== null && row.qty !== undefined && isFinite(Number(row.qty))
    const cleared = hasQty && Number(row.qty) <= 0
    let dayTitle = '当日盈亏 / 当日涨跌幅 =（现价 − 昨收）× 股数'
    if (row.prev_close !== null && row.prev_close !== undefined) dayTitle += '；昨收 ' + priceText(row.prev_close)
    if (row.xq_symbol) dayTitle += '\n行情代码 ' + row.xq_symbol
    return el('div', { key: 'r' + row.code, className: 'xq-pos-grid xq-pos-row' + (cleared ? ' xq-pos-cleared' : '') }, [
      el('span', { key: 'n', className: 'xq-pos-name' }, [
        el('span', { key: 'nm', className: 'xq-pos-nm', title: row.name || row.code }, row.name || row.code || '—'),
        el('span', { key: 'cd', className: 'xq-pos-code' }, row.code || ''),
        cleared ? el('span', { key: 'd', className: 'xq-pos-days' }, '已清仓') : null
      ]),
      el('span', { key: 'q', className: 'xq-pos-r xq-pos-num', title: '股数' }, qtyText(row.qty)),
      el('span', { key: 'c', className: 'xq-pos-r xq-pos-num xq-pos-cost', title: '持仓成本价（摊薄成本）' }, priceText(row.cost)),
      el('span', { key: 'p', className: 'xq-pos-r xq-pos-num' }, priceText(row.price)),
      el('span', { key: 'd', className: 'xq-pos-cell' },
        cleared
          ? changeCell(null, null, false, '已清仓（股数 0）：不计入合计，可删掉这一行')
          : changeCell(row.day_profit, row.day_rate, true, dayTitle)),
      el('span', { key: 'v', className: 'xq-pos-r xq-pos-num' }, money(row.value)),
      el('span', { key: 'y', className: 'xq-pos-cell' }, changeCell(row.hold_profit, row.hold_rate, !cleared, '持仓盈亏 / 持仓收益率（相对成本价）')),
      el('span', { key: 'o', className: 'xq-pos-r xq-pos-ops' }, [
        el('button', { key: 'e', className: 'xq-btn-mini', disabled: busy, onClick: function () { openEdit(row) } }, '编辑'),
        el('button', { key: 'x', className: 'xq-btn-mini', disabled: busy, onClick: function () { removeRow(row) } }, '删除')
      ])
    ])
  })

  // ---- 同步区 ----
  const b = book || {}
  const portfolios = b.portfolios || []
  const cloud = data.cloud || null
  const syncSection = syncOpen ? el('div', { key: 'sync', className: 'xq-pos-sync' }, [
    el('div', { key: 't', className: 'xq-pnl-sec' }, '从账本同步（同花顺投资账本 · 只在点按钮时请求）'),
    el('div', { key: 'st', className: 'xq-pnl-note' },
      b.configured === false
        ? '还没有账本 Cookie。粘一次就能用「同步」；不粘也行 —— 手工录入的持仓一样能算今日盈亏。'
        : (b.valid
          ? '✓ Cookie 有效，' + portfolios.length + ' 个组合'
          : ('✗ ' + (b.error || '待校验')))),
    cloud ? el('div', { key: 'cd', className: 'xq-pnl-note' },
      (cloud.synced_at ? '上次成功同步 ' + new Date(cloud.synced_at).toLocaleString('zh-CN') : '还没成功同步过')
      + (cloud.attempted_at && cloud.error ? '；上次尝试 ' + stampText(cloud.attempted_at) + ' 失败' : '')) : null,
    cloud && cloud.error ? el('div', { key: 'ce', className: 'xq-pos-hint' }, cloud.error) : null,
    el('textarea', {
      key: 'ta', className: 'xq-pnl-ta',
      placeholder: '账本 Cookie（登录 tzzb.10jqka.com.cn 后 F12 → copy(document.cookie)）',
      value: cookieDraft,
      onChange: function (e) { setCookieDraft(e.target.value) }
    }),
    el('div', { key: 'r1', className: 'xq-pnl-row' }, [
      el('button', { key: 's', className: 'xq-btn', disabled: busy || cookieDraft.trim().length === 0, onClick: saveCookie }, '保存并校验'),
      portfolios.length ? el('select', {
        key: 'sel', className: 'xq-pnl-sel', value: b.fundKey || '', disabled: busy || portfolios.length < 2,
        onChange: function (e) { chooseFund(e.target.value) }
      }, portfolios.map(function (it, i) {
        return el('option', { key: String(i), value: it.fund_key }, it.name || it.fund_key)
      })) : null
    ]),
    el('div', { key: 'r2', className: 'xq-pnl-row' }, [
      el('button', { key: 'm', className: 'xq-btn', disabled: busy || b.valid !== true, onClick: function () { doSync('merge') }, title: '账本有则更新股数/成本，账本没有的本地行保留' }, busy ? '同步中…' : '从账本导入 / 校对'),
      el('button', { key: 'r', className: 'xq-btn', disabled: busy || b.valid !== true, onClick: function () { doSync('replace') }, title: '整表以账本为准，手工录入的行会被清掉' }, '用账本覆盖全部')
    ]),
    el('div', { key: 'note', className: 'xq-pnl-note' },
      '同步会更新「股数」与「成本价」这两列（账本是这两个数的来源），价格与盈亏仍然由行情现算。' +
      '同步失败不影响持仓与今日盈亏 —— 这正是把账本降级成「一次性导入工具」的目的。')
  ]) : null

  const headLine = el('div', { key: 'hl', className: 'xq-pos-head' }, [
    el('span', { key: 't', className: 'xq-pos-title' },
      '共 ' + rows.length + ' 只' + (data.updated_at ? ' · 本地数据 ' + stampText(data.updated_at) : '')),
    el('span', { key: 'sp', className: 'xq-spacer' }),
    el('button', { key: 'add', className: 'xq-btn-mini', disabled: busy, onClick: openAdd }, '＋ 添加持仓'),
    el('button', { key: 'syn', className: 'xq-btn-mini', onClick: function () { setSyncOpen(!syncOpen) } }, syncOpen ? '收起同步区' : '从账本同步'),
    el('button', { key: 'rf', className: 'xq-btn-mini', disabled: busy, onClick: refreshNow }, busy ? '刷新中…' : '刷新行情')
  ])

  const dayMissing = rows.length > 0 && rows.every(function (r) { return r.day_profit === null || r.day_profit === undefined })

  const notes = [
    el('div', { key: 'n1', className: 'xq-pnl-note' },
      '持仓是本地数据（可增删改）；股数 × 成本价就是「输入」，现价 / 当日盈亏 / 持仓盈亏全部由雪球行情现算，不落盘。'),
    el('div', { key: 'n2', className: 'xq-pnl-note' },
      '当日盈亏 =（现价 − 昨收）× 股数；持仓盈亏 =（现价 − 成本价）× 股数。合计按逐行取整后相加，' +
      '所以和表格里每一行的数字对得上。')
  ]
  if (dayMissing) {
    notes.push(el('div', { key: 'nq', className: 'xq-pos-hint' }, '当日盈亏暂不可用（雪球行情取数失败），其余字段不受影响'))
  }
  if (msg) notes.unshift(el('div', { key: 'm', className: msg.ok ? 'xq-pnl-ok' : 'xq-err' }, (msg.ok ? '✓ ' : '✗ ') + msg.text))
  if (rows.length === 0 && !formEl) {
    notes.unshift(el('div', { key: 'n0', className: 'xq-loading' },
      '还没有持仓：点「＋ 添加持仓」手工录入，或展开「从账本同步」拉一次账本。'))
  }

  return el('div', null, [
    el('div', { key: 'stats', className: 'xq-pos-stats' }, stats),
    headLine,
    formEl,
    el('div', { key: 'tbl', className: 'xq-pos-table' }, [head].concat(body)),
    syncSection,
    el('div', { key: 'notes', className: 'xq-pos-notes' }, notes)
  ])
}

// XueqiuPanel：面板内容容器（数据 + tab 条 + 查表分发）。
//
// 内层视图（LoginBox / MarketTab / DetailView / HotTab / SearchTab / NewsTab / PnlTab）已提到模块作用域，
// 原来靠父级闭包读的 state/句柄改为「调用点组装显式上下文 p」传入；本文件只保留数据逻辑。
//
// tab 分发表：ui.tab → 组件。注意 DetailView 不在此表 —— 详情由 view 真值门控（旧 if/else 链
// 也是先判 view），且宿主 ui.get 会把 tab 白名单化成 market/hot/search/news/pnl/positions。把 detail 塞进
// 查表会让理论上不可达的 tab='detail' 渲染详情骨架（旧行为是落到快讯页），属于行为变化。

const XQ_TABS = { market: MarketTab, hot: HotTab, search: SearchTab, news: NewsTab, pnl: PnlTab, positions: PositionsTab }

// ---------- 面板内容（数据 + tabs + 详情） ----------
function XueqiuPanel() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [watchlist, setWatchlist] = React.useState([])
  const [quotes, setQuotes] = React.useState([])
  // 价格闪烁：记录上一价与变化方向（symbol -> 1|-1），行渲染时挂一次性动画类
  const prevPrices = React.useRef({})
  const [flashDir, setFlashDir] = React.useState({})
  const [indices, setIndices] = React.useState([])
  const [hot, setHot] = React.useState([])
  const [hotMarket, setHotMarket] = React.useState('cn')
  // 竞态防护：行情/热榜/搜索的响应序号（旧响应到达时序号已过期则丢弃，防慢请求覆盖新结果）
  const marketSeq = React.useRef(0)
  const hotSeq = React.useRef(0)
  const searchSeq = React.useRef(0)
  // 轮询闭包读当前市场（interval 闭包不随状态更新，直接捕获 state 会拿到 stale 值）
  const hotMarketRef = React.useRef(hotMarket)
  hotMarketRef.current = hotMarket
  const [news, setNews] = React.useState([])
  const newsSeq = React.useRef(0)
  const [newsMore, setNewsMore] = React.useState(false)   // 翻页加载中
  const [newsNoMore, setNewsNoMore] = React.useState(false) // 已到最旧
  const [searchQ, setSearchQ] = React.useState('')
  const [searchMode, setSearchMode] = React.useState('stock')
  const [searchRes, setSearchRes] = React.useState([])
  const [searching, setSearching] = React.useState(false)
  const [manualCode, setManualCode] = React.useState('')
  const [view, setView] = React.useState(null)
  const [detail, setDetail] = React.useState(null)
  // K线到达早于详情骨架时的暂存（view 与 period 两个 effect 并行取数，避免丢数据）
  const klineStash = React.useRef(null)
  const [klinePeriod, setKlinePeriod] = React.useState('day')
  const [chartMode, setChartMode] = React.useState('kline')
  const [marketOpen, setMarketOpen] = React.useState(true)
  const [err, setErr] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [sortK, setSortK] = React.useState('default')
  const [sortAsc, setSortAsc] = React.useState(false)
  // 可选登录态（粘贴浏览器 Cookie）：null=未知，{loggedIn}=状态
  const [login, setLoginSt] = React.useState(null)
  const [loginOpen, setLoginOpen] = React.useState(false)
  const [cookieInput, setCookieInput] = React.useState('')
  const [loginBusy, setLoginBusy] = React.useState(false)
  const [loginMsg, setLoginMsg] = React.useState(null)   // {ok, text}
  const [alertRules, setAlertRules] = React.useState([])
  const [alertEvents, setAlertEvents] = React.useState([])
  const [alertNotice, setAlertNotice] = React.useState([])
  const [alertDrafts, setAlertDrafts] = React.useState({})
  const [alertBusy, setAlertBusy] = React.useState({})
  const [ackBusy, setAckBusy] = React.useState(false)   // 确认 RPC 在途：只用于按钮态，判定重入用 ref
  const noticeSeeded = React.useRef(false)
  const ackPending = React.useRef(false)
  const tab = ui.tab
  function setTab(t) { ui.set({ tab: t }) }
  // 规则变更后立刻核对一次：提醒轮询本身归应用级 alerts-watch 运行时，面板只订阅它的快照。
  function kickAlerts() {
    const rt = getAlertsWatchRuntime()
    if (rt) rt.kick()
  }
  // 快照落点：rules/events 直接上屏；fresh 是新事件（= 该弹通知的那批，通知已由运行时发出）。
  // 面板这里只负责把它们追加到「页面内通知区」—— 那是 ack 的入口，不显示就等于永远确认不掉。
  function applyAlerts(state, fresh) {
    const rules = (state && Array.isArray(state.rules)) ? state.rules : []
    const events = (state && Array.isArray(state.events)) ? state.events : []
    setAlertRules(rules)
    setAlertEvents(events)
    // 首份快照只把最近 ALERT_NOTICE_LIMIT 条未确认事件放进通知区（与宿主保留新事件的约定一致：
    // 超出 ALERT_MAX_EVENTS 时 slice(-N)，events 时间升序），避免陈年旧事件撑爆面板；
    // 确认掉这批后重开面板即可看到更早的一批，不会被永久藏住。
    if (!noticeSeeded.current) {
      noticeSeeded.current = true
      if (events.length) setAlertNotice(events.slice(-ALERT_NOTICE_LIMIT))
      return
    }
    if (!fresh || !fresh.length) return
    setAlertNotice(function (prev) {
      const prior = prev || []
      return prior.concat(fresh.filter(function (e) {
        const id = alertEventId(e)
        return !prior.some(function (x) { return alertEventId(x) === id })
      }))
    })
  }
  function setAlert(symbol, rawTarget, direction, enabled) {
    const target = Number(rawTarget)
    if (!isFinite(target) || (direction !== 'above' && direction !== 'below')) {
      setErr('请输入有效提醒价位，并选择 above/below')
      return
    }
    setAlertBusy(function (b) { return Object.assign({}, b, { [symbol]: true }) })
    saveAlert(symbol, target, direction, enabled !== false).then(function (data) {
      setAlertRules((data && data.rules) || [])
      kickAlerts()   // 运行时的规则快照/节奏跟着改：新增规则后要从 5 分钟空闲节奏回到 30 秒
      setErr('')
    }).catch(function (e) {
      setErr(String((e && e.message) || e))
    }).then(function () { setAlertBusy(function (b) { const n = Object.assign({}, b); delete n[symbol]; return n }) })
  }
  function removeAlertRule(symbol) {
    setAlertBusy(function (b) { return Object.assign({}, b, { [symbol]: true }) })
    removeAlert(symbol).then(function (data) {
      setAlertRules((data && data.rules) || [])
      kickAlerts()   // 删掉最后一条后运行时停表；删掉一条也要让节奏/基线跟宿主对齐
      setErr('')
    }).catch(function (e) {
      setErr(String((e && e.message) || e))
    }).then(function () { setAlertBusy(function (b) { const n = Object.assign({}, b); delete n[symbol]; return n }) })
  }
  function acknowledgeAlerts(events) {
    const ids = (events || []).map(function (e) { return e && (e.id != null ? e.id : e.event_id) }).filter(function (id) { return id != null && id !== '' })
    if (!ids.length) return
    if (ackPending.current) return   // 上一笔确认还在路上：不重复提交，也不叠加待删集合
    ackPending.current = true
    setAckBusy(true)
    // key 用 alertEventId 的字符串形态，与下面过滤时算出的 id 同构（宿主 id 万一是数字也不会漏删）
    const acked = {}
    ids.forEach(function (id) { acked[String(id)] = true })
    // 先等 RPC 成功再动本地状态：原来先乐观删除，ack RPC 一失败宿主仍记录着事件，
    // 但事件已被本地「已知」集合认作已处理，下轮既不会再通知也不会把它放回通知区，
    // 表现为「点了确认却没确认掉，而且再也看不见了」。失败时保留事件并报错，可直接重试。
    ackAlerts(ids).then(function (data) {
      const remaining = (data && Array.isArray(data.events)) ? data.events : null
      if (remaining) setAlertEvents(remaining)   // 宿主回传剩余事件，直接以它为准
      else setAlertEvents(function (prev) { return (prev || []).filter(function (e) { return !acked[alertEventId(e)] }) })
      setAlertNotice(function (prev) { return (prev || []).filter(function (e) { return !acked[alertEventId(e)] }) })
      kickAlerts()   // 让运行时的快照与宿主一致（否则它的 events 里还留着已被确认掉的那几条）
      setErr('')
    }).catch(function (e) {
      setErr('确认提醒失败：' + String((e && e.message) || e))
    }).then(function () {
      ackPending.current = false
      setAckBusy(false)
    })
  }

  function refreshMarket(force) {
    const my = ++marketSeq.current
    return Promise.all([
      fetchWatchlist(),
      fetchIndices(force)
    ]).then(function (res) {
      if (marketSeq.current !== my) return
      const wl = (res[0] && res[0].symbols) || []
      const status = res[1] ? res[1].status : null
      // 空响应/临时异常没有足够信息判断盘中，不要把轮询误降到休市节奏；
      // 下一轮成功拿到状态后再切换。
      if (status === 5 || status === 6) setMarketOpen(true)
      else if (status !== null && status !== undefined) setMarketOpen(false)
      setWatchlist(wl)
      setIndices((res[1] && res[1].list) || [])
      setErr('')
      if (!wl.length) return
      return fetchQuote(wl, force).then(function (data) {
        if (marketSeq.current !== my) return
        const list = (data && data.list) || []
        // 批量行情会整只丢弃无效/退市代码：补占位行（现价/涨跌全 '--'，仍可删除/查详情），
        // 否则"加进自选却凭空消失"没有任何反馈
        const seen = {}
        list.forEach(function (q) { seen[q.symbol] = 1 })
        const missing = wl.filter(function (s) { return !seen[s] }).map(function (s) { return { symbol: s } })
        const dirs = {}
        list.forEach(function (q) {
          if (q.current === null || q.current === undefined) return
          const prev = prevPrices.current[q.symbol]
          if (prev !== undefined && q.current !== prev) dirs[q.symbol] = q.current > prev ? 1 : -1
          prevPrices.current[q.symbol] = q.current
        })
        if (Object.keys(dirs).length) setFlashDir(dirs)
        setQuotes(list.concat(missing))
      })
    }).catch(function (e) {
      if (marketSeq.current === my) setErr(String((e && e.message) || e))
    })
  }

  function refreshContent() {
    const my = ++hotSeq.current
    const newsMy = ++newsSeq.current
    const market = hotMarketRef.current   // 读当前市场（轮询闭包防 stale）
    Promise.all([
      call(A_HOT, { market: market, size: HOT_LIST_SIZE }),
      call(A_NEWS, { count: NEWS_PAGE_SIZE })
    ]).then(function (res) {
      if (hotSeq.current !== my) return   // 期间用户切了市场/触发过手动刷新：丢弃旧响应
      if (newsSeq.current !== newsMy) return
      setHot((res[0] && res[0].list) || [])
      setNews((res[1] && res[1].items) || [])
      setNewsMore(false)
      setNewsNoMore(false)
      setErr('')
    }).catch(function (e) {
      if (hotSeq.current === my && newsSeq.current === newsMy) setErr(String((e && e.message) || e))
    })
  }

  // 快讯翻页：max_id = 当前最旧一条 id，返回严格更早的记录
  function loadMoreNews() {
    if (newsMore || newsNoMore || !news.length) return
    const maxId = news[news.length - 1].id
    const my = ++newsSeq.current
    setNewsMore(true)
    call(A_NEWS, { count: NEWS_PAGE_SIZE, max_id: maxId }).then(function (res) {
      if (newsSeq.current !== my) return
      const items = (res && res.items) || []
      const seen = {}
      news.forEach(function (it) { seen[it.id] = true })
      const fresh = items.filter(function (it) { return !seen[it.id] })
      if (!fresh.length) setNewsNoMore(true)
      else setNews(news.concat(fresh))
      setNewsMore(false)
    }).catch(function () {
      if (newsSeq.current === my) setNewsMore(false)
    })
  }

  React.useEffect(function () {
    setLoading(true)
    call(A_LOGIN_STATUS, {}).then(function (d) { setLoginSt(d || { loggedIn: false }) }).catch(function () { setLoginSt({ loggedIn: false }) })
    refreshMarket().then(function () { return refreshContent() })
      .then(function () { setLoading(false) })
      .catch(function () { setLoading(false) })
    return function () { /* 一次性 */ }
  }, [])

  React.useEffect(function () {
    // 提醒轮询归应用级 alerts-watch 运行时（它与面板挂载、与行情隐身都无关，见 store/alerts-watch.js）；
    // 面板只订阅快照。打开面板时顺手 kick 一次，避免看到上一次 tick 的旧列表。
    const watch = getAlertsWatchRuntime()
    if (!watch) return function () { }
    const off = watch.subscribe(applyAlerts)
    watch.kick()
    return off
  }, [])

  React.useEffect(function () {
    const marketMs = marketOpen ? POLL_MARKET_OPEN_MS : POLL_MARKET_CLOSED_MS
    const contentMs = marketOpen ? POLL_CONTENT_OPEN_MS : POLL_CONTENT_CLOSED_MS
    // 行情持续轮询；热榜/快讯在隐藏页暂停以降低请求量。
    const stopA = rt.ctx.interval(function () { refreshMarket() }, marketMs)
    const stopB = rt.ctx.interval(function () { if (!pageHidden()) refreshContent() }, contentMs)
    function onVis() {
      if (!pageHidden()) { refreshMarket(); refreshContent() }
    }
    try { document.addEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    return function () {
      if (stopA) stopA(); if (stopB) stopB()
      try { document.removeEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    }
  }, [marketOpen])

  // K线历史获取（纯函数，不碰 React 状态）：图表右拖触底时拉更早的 500 根，返回原始行；
  // 图表内部自行前插持有全部历史，React 缓冲始终只是初始窗口（避免双数据源互相反馈）。
  function fetchEarlierKline(earliestTs) {
    if (!view || !detail || !detail.kline) return []
    const cur = detail.kline.rows || []
    const begin = earliestTs || (cur.length ? cur[0].timestamp : 0)
    if (!begin) return []
    // 以当前最早一根为 begin 的近似：多拉 500 根（count 负值=含 begin 往前），host 侧 type:'before' 返回区间
    return call(A_KLINE, { symbol: view, period: klinePeriod, count: KLINE_PAGE_SIZE, begin: begin }).then(function (res) {
      return (res && res.rows) || []
    }).catch(function () { return [] /* 追加失败静默：图表仍可看已有缓冲 */ })
  }

  // 详情骨架（报价/分时/财务/KOL）：只在换标的时整体重建；
  // v1.22.10 前 klinePeriod 也在依赖里，切周期会把整个详情清空重拉 5 个接口——
  // 表现为切周期时报价/图例/周期丸闪灭 100-300ms，快速连点会丢按钮
  React.useEffect(function () {
    if (!view) { setDetail(null); return }
    let alive = true
    klineStash.current = null
    setDetail(null)
    function fb(p) { return p.catch(function () { return null }) }
    // 渐进渲染：报价先上屏（K线由下方周期 effect 并行供给，到达早于骨架时走 stash），分时/财务/KOL 到达后补充
    const pQuote = fb(call(A_QUOTE_DETAIL, { symbol: view }))
    const pMinute = fb(call(A_MINUTE, { symbol: view }))
    const pFinance = fb(call(A_FINANCE, { symbol: view }))
    const pKol = fb(call(A_KOL, { symbol: view, count: KOL_SIZE }))
    pQuote.then(function (res) {
      if (!alive) return
      setDetail({
        quote: (res && res.quote) || {},
        kline: klineStash.current || { rows: [] },
        minute: { items: [], last_close: null },
        finance: { list: [] },
        kol: []
      })
      if (!res) setErr('详情加载失败，数据可能不完整')
      // 其余部分到达后增量合并
      pMinute.then(function (m) { if (alive && m) setDetail(function (d) { return d ? Object.assign({}, d, { minute: m }) : d }) })
      pFinance.then(function (f) { if (alive && f) setDetail(function (d) { return d ? Object.assign({}, d, { finance: f }) : d }) })
      pKol.then(function (k) { if (alive && k) setDetail(function (d) { return d ? Object.assign({}, d, { kol: k.list || [] }) : d }) })
    }).catch(function (e) {
      if (alive) setErr(String((e && e.message) || e))
    })
    return function () { alive = false }
  }, [view])

  // 详情驻留期间也要更新报价/分时；原来只在切换标的时请求一次，打开十几分钟后
  // 现价会永久停在旧值。回到前台立即补一次，force 跳过短 TTL。
  React.useEffect(function () {
    if (!view) return function () {}
    let alive = true
    function refreshLive() {
      // 详情报价/分时即使页面隐藏也继续请求；浏览器可能对 timer 做节流。
      Promise.all([
        call(A_QUOTE_DETAIL, { symbol: view, force: true }).catch(function () { return null }),
        call(A_MINUTE, { symbol: view, force: true }).catch(function () { return null })
      ]).then(function (res) {
        if (!alive) return
        const q = res[0] && res[0].quote
        const m = res[1]
        if (!q && !m) return
        setDetail(function (d) {
          if (!d) return d
          return Object.assign({}, d, q ? { quote: q } : {}, m ? { minute: m } : {})
        })
      })
    }
    const liveMs = marketOpen ? POLL_MARKET_OPEN_MS : POLL_MARKET_CLOSED_MS
    const stop = rt.ctx.interval(refreshLive, liveMs)
    function onVis() { if (!pageHidden()) refreshLive() }
    try { document.addEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    return function () {
      alive = false
      if (stop) stop()
      try { document.removeEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    }
  }, [view, marketOpen])

  // K线按周期独立拉取：切周期只清图表数据、只发 1 个请求，报价与周期丸全程保持可点
  React.useEffect(function () {
    if (!view) return
    let alive = true
    setDetail(function (d) { return d ? Object.assign({}, d, { kline: { rows: [] } }) : d })
    call(A_KLINE, { symbol: view, period: klinePeriod, count: KLINE_PAGE_SIZE }).then(function (res) {
      if (!alive || !res) return
      klineStash.current = res
      setDetail(function (d) { return d ? Object.assign({}, d, { kline: res }) : d })
    }).catch(function () { /* 周期拉取失败：保持空图，不推翻已有详情 */ })
    return function () { alive = false }
  }, [view, klinePeriod])

  // Esc：先关详情，再收起面板（输入框内不触发）
  React.useEffect(function () {
    if (typeof window === 'undefined' || !window.addEventListener) return function () {}
    function onKey(e) {
      if (e.key !== 'Escape') return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (loginOpen) setLoginOpen(false)
      else if (view) setView(null)
      else ui.set({ open: false })
    }
    window.addEventListener('keydown', onKey)
    return function () { window.removeEventListener('keydown', onKey) }
  }, [view, loginOpen])

  function openDetail(symbol) {
    setChartMode('kline')
    setKlinePeriod('day')
    setView(symbol)
  }

  function addWatch(symbol) {
    call(A_WATCHLIST_ADD, { symbol: symbol }).then(function (data) {
      setWatchlist((data && data.symbols) || [])
      refreshMarket()
    }).catch(function (e) { setErr(String((e && e.message) || e)) })
  }

  function removeWatch(symbol) {
    call(A_WATCHLIST_REMOVE, { symbol: symbol }).then(function (data) {
      setWatchlist((data && data.symbols) || [])
      setQuotes(quotes.filter(function (q) { return q.symbol !== symbol }))
    }).catch(function (e) { setErr(String((e && e.message) || e)) })
  }

  function doSearch() {
    const q = searchQ.trim()
    if (!q) return
    setSearching(true)
    const my = ++searchSeq.current
    const p = searchMode === 'stock'
      ? call(A_SEARCH, { q: q, count: SEARCH_STOCK_SIZE })
      : call(A_SEARCH_POSTS, { q: q, count: SEARCH_POST_SIZE })
    p.then(function (data) {
      if (searchSeq.current !== my) return   // 快速连搜：只认最后一次
      setSearchRes((data && data.list) || [])
    }).catch(function (e) {
      if (searchSeq.current !== my) return
      setErr(String((e && e.message) || e))
      setSearchRes([])
    }).then(function () { if (searchSeq.current === my) setSearching(false) })
  }

  function addManual() {
    const code = manualCode.trim().toUpperCase()
    if (!code) return
    addWatch(code)
    setManualCode('')
  }

  // ---- 可选登录 ----
  function doLogin() {
    const c = cookieInput.trim()
    if (!c) { setLoginMsg({ ok: false, text: '请先粘贴 Cookie' }); return }
    setLoginBusy(true)
    setLoginMsg(null)
    call(A_LOGIN_SAVE, { cookie: c }).then(function (d) {
      setLoginSt({ loggedIn: true, screenName: (d && d.screenName) || '', uid: d ? d.uid : null })
      setLoginMsg({ ok: true, text: '登录成功' + ((d && d.screenName) ? '：' + d.screenName : '') + (d && d.symbols ? '，已同步云端自选 ' + d.symbols.length + ' 只' : '') })
      setCookieInput('')
      setLoginOpen(false)
      refreshMarket()
    }).catch(function (e) {
      setLoginMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setLoginBusy(false) })
  }

  function doLogout() {
    setLoginBusy(true)
    call(A_LOGIN_LOGOUT, {}).then(function () {
      setLoginSt({ loggedIn: false })
      setLoginMsg({ ok: true, text: '已退出登录（本地自选股保留）' })
    }).catch(function (e) {
      setLoginMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setLoginBusy(false) })
  }

  function doPull() {
    setLoginBusy(true)
    setLoginMsg(null)
    call(A_WATCHLIST_PULL, {}).then(function (d) {
      setLoginMsg({ ok: true, text: '已同步云端自选 ' + (((d && d.symbols) || []).length) + ' 只' })
      refreshMarket()
    }).catch(function (e) {
      setLoginMsg({ ok: false, text: String((e && e.message) || e) })
    }).then(function () { setLoginBusy(false) })
  }

  const tabs = el('div', { className: 'xq-tabs' }, PANEL_TABS.map(function (t) {
    return el('button', {
      key: t[0], className: 'xq-tab' + (tab === t[0] ? ' xq-tab-active' : ''),
      onClick: function () { setTab(t[0]); if (view) setView(null) }
    }, t[1])
  }).concat([
    el('span', { key: 'sp', className: 'xq-spacer' }),
    el('button', {
      key: 'acc', className: 'xq-btn xq-acc-btn' + (login && login.loggedIn ? ' xq-acc-on' : ''),
      title: login && login.loggedIn ? '已登录：' + (login.screenName || login.uid || '') + '（点击管理）' : '可选：登录雪球后使用云端自选股',
      onClick: function () { setLoginMsg(null); setLoginOpen(true) }
    }, login && login.loggedIn ? '👤 ' + (login.screenName || '已登录') : '👤 登录'),
    el('button', {
      key: 'btn', className: 'xq-btn', disabled: loading, title: '刷新全部数据',
      onClick: function () {
        setLoading(true)
        // 持仓/盈亏视图一并刷新（refresh 内部已做并发去重，与后台轮询不会重复请求）；
        // force=true 绕过行情 10 秒缓存，用户点了「刷新」就该看到新价。
        const posRt = getPositionsRuntime()
        Promise.all([refreshMarket(true), refreshContent(), posRt ? posRt.refresh(true) : Promise.resolve()]).then(function () { setLoading(false) }).catch(function () { setLoading(false) })
      }
    }, loading ? [el('span', { key: 's', className: 'xq-refresh-spin' }, '⟳'), ' 刷新中'] : '刷新')
  ]))

  const errBox = err ? el('div', { className: 'xq-err' }, err) : null
  const alertBox = alertNotice.length ? el('div', { className: 'xq-alert-notice', role: 'status' }, [
    el('strong', { key: 'title' }, '价格提醒'),
    alertNotice.map(function (e) {
      const id = alertEventId(e)
      return el('div', { key: id, className: 'xq-alert-event' }, [
        el('span', { key: 'text' }, (e.name || e.symbol || '标的') + ' 已触发 ' + (e.direction === 'below' ? '≤' : '≥') + ' ' + (e.target == null ? '' : e.target) + (e.current == null ? '' : '（现价 ' + e.current + '）')),
        el('button', {
          key: 'ack', className: 'xq-btn-mini', disabled: ackBusy,
          title: ackBusy ? '确认请求处理中…' : '确认后从宿主记录中移除该事件',
          onClick: function () { acknowledgeAlerts([e]) }
        }, ackBusy ? '确认中' : '确认')
      ])
    })
  ]) : null

  // 每个 tab 的显式上下文工厂：字段 = 该 tab 函数体里用到的父级 state/句柄
  // （MarketTab/HotTab/SearchTab/NewsTab 的字段清单见各自文件头部注释；PnlTab 自取运行时，故返回空对象）
  const TAB_CTX = {
    market: function () {
      return {
        quotes: quotes, indices: indices, flashDir: flashDir,
        sortK: sortK, sortAsc: sortAsc, setSortK: setSortK, setSortAsc: setSortAsc,
        openDetail: openDetail, removeWatch: removeWatch,
        manualCode: manualCode, setManualCode: setManualCode, addManual: addManual,
        alertRules: alertRules, alertDrafts: alertDrafts, setAlertDrafts: setAlertDrafts,
        setAlert: setAlert, removeAlert: removeAlertRule, alertBusy: alertBusy
      }
    },
    hot: function () {
      return {
        hot: hot, hotMarket: hotMarket, setHotMarket: setHotMarket,
        hotSeq: hotSeq, setHot: setHot, setErr: setErr, openDetail: openDetail
      }
    },
    search: function () {
      return {
        searchQ: searchQ, setSearchQ: setSearchQ, searchMode: searchMode, setSearchMode: setSearchMode,
        searchRes: searchRes, setSearchRes: setSearchRes, searching: searching,
        doSearch: doSearch, openDetail: openDetail, addWatch: addWatch
      }
    },
    news: function () {
      return {
        news: news, newsMore: newsMore, newsNoMore: newsNoMore, loadMoreNews: loadMoreNews
      }
    },
    pnl: function () {
      return {}   // PnlTab 自身订阅盈亏运行时，不需要父级任何字段
    },
    positions: function () {
      return {}   // PositionsTab 自身订阅持仓运行时，不需要父级任何字段
    }
  }

  // tab 分发：旧 if/else 链里 market/hot/search 之外的任何 tab 都落到 NewsTab；
  // 这里用 hasOwnProperty 判定，未知 tab（含 undefined/'toString' 这类原型键）统一走 news。
  const tabKey = Object.prototype.hasOwnProperty.call(XQ_TABS, ui.tab) ? ui.tab : 'news'
  const renderTab = XQ_TABS[tabKey]

  // 必须用 el(组件, 属性) **挂载成真正的组件**，不能写成 LoginBox({...}) / renderTab(...) 这样的
  // 裸函数调用 —— 裸调用会把子组件的 hooks 记到 XueqiuPanel 自己的 hook 链表上：切到「盈亏」
  // （PnlTab 有 7 个 hooks）时链表变长、切走时变短，React 直接抛
  // "Rendered fewer hooks than expected"，整棵面板树被卸载且再也打不开。
  // 其它 tab 目前恰好一个 hook 都不用，所以这个坑只在盈亏身上炸——但根因是挂载方式，不是 PnlTab。
  let content
  if (loginOpen) {
    content = el(LoginBox, {
      login: login, cookieInput: cookieInput, setCookieInput: setCookieInput,
      loginMsg: loginMsg, loginBusy: loginBusy,
      doLogin: doLogin, doLogout: doLogout, doPull: doPull,
      setLoginOpen: setLoginOpen, setLoginMsg: setLoginMsg
    })
  } else if (view) {
    content = el(DetailView, {
      detail: detail, view: view, setView: setView,
      chartMode: chartMode, setChartMode: setChartMode,
      klinePeriod: klinePeriod, setKlinePeriod: setKlinePeriod,
      fetchEarlierKline: fetchEarlierKline
    })
  } else {
    const tabProps = TAB_CTX[tabKey]()
    tabProps.key = tabKey   // 每个 tab 一棵独立的 fiber：切换即卸载重挂，不共享 hook 链表
    content = el(renderTab, tabProps)
  }

  // key 变化触发 xq-fade-in 重放：tab/详情切换有轻微淡入
  return el('div', null, [tabs, alertBox, errBox, el('div', { key: 'v-' + (loginOpen ? 'login' : (view ? 'd' : tab)), className: 'xq-view' }, content)])
}

// 隐身状态下的**唯一可见痕迹**：左下角一枚小胶囊，点一下就把行情界面全部恢复。
//
// 为什么需要它：原来隐身后屏幕上什么都不剩，只能靠快捷键（记不住）或对 AI 说话（要打字），
// 恢复成本明显高于隐藏成本 —— 用户实测后要求「左下角一个简单按钮，一按就开」。
//
// 它由 shell.overlay 的徽章门控渲染（见 badge.js 的 MiniBadge），因此：
//   · 全局唯一、跨会话/跨页面都在（设置页也看得见，正好不会走丢）；
//   · **不发任何请求** —— 隐身期间「零请求」这条不变量不受影响（胶囊只是 ui 状态的一个开关）。
//   · 只做「恢复」这一件事，不做开合切换：隐藏动作有面板头和徽章上的按钮，不缺入口。

function RestorePill() {
  const rt = getUiRuntime()
  const ui = rt.ui
  function restore() {
    // 顺手确认通知权限：隐身后提醒照常，但浏览器里请求权限必须发生在用户手势内。
    ensureAlertPermission()
    ui.set({ hidden: false })
  }
  return el('div', {
    className: 'xq-restore',
    title: '行情已隐藏 · 点这里恢复（快捷键 Ctrl/⌘+Alt+Shift+X，或对 AI 说「把行情打开」）',
    role: 'button',
    tabIndex: 0,
    onClick: restore,
    onKeyDown: function (e) {
      if (e && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) { e.preventDefault(); restore() }
    }
  }, [
    el('span', { key: 'dot', className: 'xq-restore-dot' }, null),
    el('span', { key: 't', className: 'xq-restore-txt' }, '行情')
  ])
}

// 迷你悬浮徽章（shell.overlay）：可拖动、右下角手柄调宽度。
// 形态 C：默认区域模式（320px 宽，前 12 只自选静态平铺换行）；⤡ 手柄可调宽 120–480px，双击复位 320。
// 悬停弹层已砍掉：速览靠拉宽徽章，完整功能点徽章开面板。

// ---------- 迷你悬浮徽章（shell.overlay）：可拖动、右下角手柄调宽度 ----------
// 门控与 DockGate 同款：水合完成前不挂载（否则刷新瞬间会先按默认参数画一次再做布局钳制）。
// 行情隐身时不挂实体，只留左下角那枚恢复胶囊 —— 实例不挂载，它那份 POLL_BADGE_MS 轮询自然不存在。
function MiniBadge() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [, force] = React.useState(0)
  React.useEffect(function () {
    // [fork-fix] 应用级水合入口：shell.overlay 全局只挂一次，不随会话切换重放旧持久化值
    hydrateUi()
    const off = ui.subscribe(function () { force(function (x) { return x + 1 }) })
    return off
  }, [])
  if (!ui.hydrated) return null
  if (ui.hidden) return el(RestorePill, null)
  return el(MiniBadgeBody, null)
}

function MiniBadgeBody() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [top, setTop] = React.useState([])
  const refreshSeq = React.useRef(0)

  React.useEffect(function () {
    let alive = true
    function refresh() {
      const my = ++refreshSeq.current
      // 徽章只展示标题与自选行情；行情请求不因页面隐藏而停止。
      fetchWatchlist().then(function (wl) {
        if (!alive || refreshSeq.current !== my) return
        const symbols = ((wl && wl.symbols) || []).slice(0, BADGE_WATCH_LIMIT)
        if (!symbols.length) { setTop([]); return }
        return fetchQuote(symbols).then(function (data) {
          if (alive && refreshSeq.current === my) setTop((data && data.list) || [])
        })
      }).catch(function () { /* 静默失败：保留上一轮行情 */ })
    }
    function onVis() { refresh() }
    refresh()
    const stop = rt.ctx.interval(refresh, POLL_BADGE_MS)
    try { document.addEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    return function () {
      alive = false; if (stop) stop()
      try { document.removeEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    }
  }, [])

  // 挂载后与视口变化时按真实渲染尺寸钳制徽标位置：
  // DockGate 恢复时只能按 badgeW 估算宽度（不含边框/极限情况），且窗口缩小后
  // 旧坐标可能落到屏幕外——这里用 offsetWidth 实测值兜底，保证徽标永远可见
  const badgeRef = React.useRef(null)
  function clampBadge() {
    const node = badgeRef.current
    if (!node || !ui.badgePos) return
    const w = node.offsetWidth || 0
    const h = node.offsetHeight || 0
    if (!w) return
    const vp = viewport()
    if (!vp) return
    const x = Math.min(Math.max(EDGE_GAP, Number(ui.badgePos.x)), Math.max(EDGE_GAP, vp.w - w - EDGE_GAP))
    const y = Math.min(Math.max(EDGE_GAP, Number(ui.badgePos.y)), Math.max(EDGE_GAP, vp.h - h - EDGE_GAP))
    if (x !== ui.badgePos.x || y !== ui.badgePos.y) ui.set({ badgePos: { x: x, y: y } })
  }
  // 每次渲染后钳制：数据异步到达→徽章长高→重渲染，逐渲染钳制无时序死角
  // （仅依赖挂载一次/ResizeObserver 的方案在慢环境漏过"渲染后才长高"的场景，CI 实测踩坑）。
  // ui.set 仅在有变更时触发下一次渲染，收敛后不再循环。
  React.useLayoutEffect(clampBadge)
  React.useEffect(function () {
    window.addEventListener('resize', clampBadge)
    let ro = null
    try {
      const node = badgeRef.current
      ro = new ResizeObserver(function () { clampBadge() })
      if (node) ro.observe(node)
    } catch (e) { /* 无 ResizeObserver 时退化为 resize 事件 + 每渲染钳制 */ }
    return function () {
      try { window.removeEventListener('resize', clampBadge) } catch (e) { /* ignore */ }
      try { if (ro) ro.disconnect() } catch (e) { /* ignore */ }
    }
  }, [])

  function isBadgeControl(e) {
    const target = e && e.target
    return !!(target && typeof target.closest === 'function' && target.closest('.xq-badge-control'))
  }
  function stopBadgeControl(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
  }
  function onDown(e) {
    // 按钮等子控件不启动徽章拖拽，也不取得 pointer capture。
    if (isBadgeControl(e)) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    rt.badgeDrag = { x: e.clientX, y: e.clientY }
    rt.badgeMoved = false
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
  }
  function onMove(e) {
    if (!rt.badgeDrag) return
    const dx = e.clientX - rt.badgeDrag.x, dy = e.clientY - rt.badgeDrag.y
    if (Math.abs(dx) + Math.abs(dy) > BADGE_DRAG_THRESHOLD) rt.badgeMoved = true
    if (!rt.badgeMoved) return
    const vp = viewport()
    const w = e.currentTarget.offsetWidth || 160
    const h = e.currentTarget.offsetHeight || 30
    let x = e.clientX - w / 2
    let y = e.clientY - h / 2
    x = Math.min(Math.max(EDGE_GAP, x), (vp ? vp.w : VIEWPORT_FALLBACK_W) - w - EDGE_GAP)
    y = Math.min(Math.max(EDGE_GAP, y), (vp ? vp.h : VIEWPORT_FALLBACK_H) - h - EDGE_GAP)
    rt.badgeDrag.x = x + w / 2
    rt.badgeDrag.y = y + h / 2
    rt.badgeDrag.pos = { x: x, y: y }
    e.currentTarget.style.left = x + 'px'
    e.currentTarget.style.top = y + 'px'
    e.currentTarget.style.right = 'auto'
    e.currentTarget.style.bottom = 'auto'
  }
  function finishDrag(e, activate) {
    // 未由徽章背景启动的 pointerup（例如工具按钮）不能误触发开合。
    if (!rt.badgeDrag) return
    const moved = rt.badgeMoved
    const pos = rt.badgeDrag.pos
    rt.badgeDrag = null
    rt.badgeMoved = false
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    if (!moved) {
      if (!activate) return
      // 胶囊点击只恢复徽章；完整徽章背景点击才开合大面板。
      if (ui.badgeCompact) ui.set({ badgeCompact: false })
      else ui.set({ open: !ui.open })
      return
    }
    if (pos) ui.set({ badgePos: pos })   // 松手一次性提交
  }
  function onUp(e) { finishDrag(e, true) }
  function onCancel(e) { finishDrag(e, false) }

  // ---- 宽度调节手柄：横向拖动改变徽章宽度（120–480px），松手持久化；双击复位为单行条 ----
  const gripDrag = React.useRef(null)
  function onGripDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.stopPropagation()   // 不触发徽章移动
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    const base = ui.badgeW || (e.currentTarget.parentElement ? e.currentTarget.parentElement.offsetWidth : 200)
    gripDrag.current = { startX: e.clientX, baseW: base }
  }
  function onGripMove(e) {
    if (!gripDrag.current) return
    e.stopPropagation()
    const vp = viewport()
    const maxW = Math.min(BADGE_W_MAX, (vp ? vp.w : VIEWPORT_FALLBACK_W) - 24)
    const w = Math.min(Math.max(BADGE_W_MIN, gripDrag.current.baseW + (e.clientX - gripDrag.current.startX)), maxW)
    ui.set({ badgeW: w })   // 拖动过程实时反馈（内存态，松手才落盘）
  }
  function onGripUp(e) {
    if (!gripDrag.current) return
    e.stopPropagation()
    gripDrag.current = null
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    rt.saveUi()   // 落盘（debounce）
  }
  function onGripDblClick(e) {
    e.stopPropagation()
    ui.set({ badgeW: null })   // 复位为默认区域宽度（320px）
    rt.saveUi()
  }


  // 默认区域模式：自选静态平铺（badgeW 未设置时用默认宽 320px；双击手柄回到 320 而非单行）
  const wide = true
  const compact = ui.badgeCompact === true
  const effW = (ui.badgeW !== null && ui.badgeW !== undefined) ? ui.badgeW : BADGE_W_DEFAULT
  // 区域模式：前 12 只全部平铺（换行）；单行模式：轮动页（页码指示）
  function wItem(q) {
    return el('span', { key: 'w-' + q.symbol, className: 'xq-witem', title: (q.name || q.symbol) + ' ' + fmt(q.current) + (q.percent !== undefined ? '  ' + fmtPct(q.percent) : '') }, [
      el('span', { key: 'n', className: 'xq-badge-hint' }, q.name || q.symbol),
      el('span', { key: 'c', className: 'xq-badge-val' }, fmt(q.current)),
      el('span', { key: 'p', className: 'xq-badge-val ' + colorOf(q.percent) }, fmtPct(q.percent))
    ])
  }
  // 悬浮徽标仅保留标题与自选行情，指数网格属于面板/底部条职责。
  const bodyEls = top.length
    ? el('div', { key: 'wg', className: 'xq-wgrid' }, top.map(wItem))
    : null
  let style = ui.badgePos
    ? { left: ui.badgePos.x, top: ui.badgePos.y, right: 'auto', bottom: 'auto' }
    : null
  if (wide && !compact) {
    if (!style) { style = {} }
    style.maxWidth = effW + 'px'
    style.width = effW + 'px'
  }
  const compactButton = el('button', {
    key: 'compact', type: 'button', className: 'xq-badge-control',
    title: compact ? '展开行情徽章' : '收起为小胶囊',
    'aria-label': compact ? '展开行情徽章' : '收起为小胶囊',
    'aria-expanded': !compact,
    onPointerDown: stopBadgeControl, onPointerMove: stopBadgeControl,
    onPointerUp: stopBadgeControl, onPointerCancel: stopBadgeControl,
    onClick: function (e) { stopBadgeControl(e); ui.set({ badgeCompact: !ui.badgeCompact }) }
  }, compact ? '+' : '−')
  // 隐身：徽章自己也能关掉自己（连指数条一起），无需先展开面板。
  // 点击时顺手请求通知权限 —— 隐身后的到价提醒依赖它，而定时器里请求常被浏览器拒绝。
  const hideButton = el('button', {
    key: 'hide', type: 'button', className: 'xq-badge-control',
    title: '完全隐藏行情（面板、徽章、指数条一起关；恢复：快捷键或让 AI 打开）',
    'aria-label': '完全隐藏行情',
    onPointerDown: stopBadgeControl, onPointerMove: stopBadgeControl,
    onPointerUp: stopBadgeControl, onPointerCancel: stopBadgeControl,
    onClick: function (e) { stopBadgeControl(e); ensureAlertPermission(); ui.set({ hidden: true }) }
  }, '⊘')
  const badgeKids = [
    el('div', { key: 'hd', className: 'xq-badge-hd' }, [
      el('span', { key: 'logo' }, [el('b', { key: 'b' }, '雪球'), 'mini']),
      el('span', { key: 'st', className: 'xq-status' + (aSession() === '盘中' ? ' xq-live' : ''), title: sessionsText() }, (function () { var s = aSession(); return s === '盘中' ? '● 盘中' : (s || '休市') })()),
      el('span', { key: 'sp', className: 'xq-spacer' }),
      // 顺序是契约：[5d] 探针把「第一个 .xq-badge-control」当成折叠按钮，
      // 所以折叠(−)在前、隐身(⊘)在后 —— 视觉上也是「先收小，再藏掉」。
      compactButton,
      hideButton,
      el('span', { key: 'ct', className: 'xq-caret' }, ui.open ? '▾' : '▴')
    ])
  ]
  if (!compact) {
    badgeKids.push(bodyEls, el('span', {
      key: 'grip', className: 'xq-badge-grip', title: '拖动调宽度 · 双击复位',
      onPointerDown: onGripDown, onPointerMove: onGripMove, onPointerUp: onGripUp, onPointerCancel: onGripUp,
      onDoubleClick: onGripDblClick
    }, '⤡'))
  }
  const badgeEl = el('div', {
    ref: badgeRef,
    className: 'xq-badge' + (compact ? ' xq-badge-compact' : ''),
    style: style,
    title: compact ? '点击胶囊恢复行情列表 · 拖动调整位置' : '点击开合行情面板 · 拖动调整位置 · 右下角 ⤡ 调宽度（双击复位）',
    onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onCancel
  }, badgeKids)
  return el('div', { style: { display: 'contents' } }, [badgeEl])
}

// 嵌入式主面板（conversation.input.dock）：输入框上方一整行。
// ---------- 嵌入式主面板（conversation.input.dock）：输入框上方一整行 ----------
// DockGate 常驻挂载：负责 hydrate + 订阅 ui，open=false 或 hidden=true 时渲染 null。
// 不能把开关写在槽位 render 闭包里——槽位函数不会因 ui 变化而重新执行。

function DockGate() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [, force] = React.useState(0)
  React.useEffect(function () {
    hydrateUi()   // 幂等：MiniBadge 已经触发过就是空操作
    const off = ui.subscribe(function () { force(function (x) { return x + 1 }) })
    return off
  }, [])
  // hidden = 行情隐身：面板/徽章/指数条三个入口一起卸载，行情轮询随之全停（FORK-NOTES §11）。
  if (!ui.hydrated || !ui.open || ui.hidden) return null
  return el(DockPanel, null)
}

function DockPanel() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const dockResize = rt.dockResize
  const [, force] = React.useState(0)
  const [tick, setTick] = React.useState(0)
  React.useEffect(function () {
    const off = ui.subscribe(function () { if (ui.hydrated) rt.saveUi(); force(function (x) { return x + 1 }) })
    return off
  }, [])
  // 每分钟重算一次交易时段提示
  React.useEffect(function () {
    const stop = rt.ctx.interval(function () { setTick(function (x) { return x + 1 }) }, POLL_DOCK_SESSION_MS)
    return function () { if (stop) stop() }
  }, [])
  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dockResize.active = true
    dockResize.startY = e.clientY
    dockResize.startH = ui.dockH || defaultDockH()
    // 拖动期间直改 DOM（不触发 React 重渲染），松手才提交一次状态
    try {
      const dock = e.currentTarget.closest('.xq-dock')
      dockResize.body = dock ? dock.querySelector('.xq-dock-body') : null
      if (dockResize.body) dockResize.body.style.transition = 'none'
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    } catch (err) { /* ignore */ }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
  }
  function onMove(e) {
    if (!dockResize.active || !dockResize.body) return
    const vp = viewport()
    const maxH = Math.round((vp ? vp.h : VIEWPORT_FALLBACK_H) * DOCK_H_VP_RATIO)
    let h = dockResize.startH + (e.clientY - dockResize.startY)
    h = Math.min(Math.max(DOCK_H_MIN, h), Math.min(maxH, DOCK_H_MAX))
    dockResize.h = h
    dockResize.body.style.height = h + 'px'   // 直接写样式，逐帧零渲染
  }
  function onUp(e) {
    if (dockResize.active && dockResize.body) {
      dockResize.body.style.transition = ''
      dockResize.body.style.height = ''
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (dockResize.h) ui.set({ dockH: dockResize.h })   // 松手一次性提交
    }
    dockResize.active = false
    dockResize.h = 0
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) { /* ignore */ }
  }
  function defaultDockH() {
    try { if (typeof window !== 'undefined' && window.innerHeight) return Math.round(window.innerHeight * DOCK_H_DEFAULT_RATIO) } catch (e) { /* ignore */ }
    return DOCK_H_FALLBACK
  }
  const bodyStyle = ui.dockH ? { height: ui.dockH + 'px' } : null
  return el('div', { className: 'xq-dock' }, [
    el('div', { key: 'head', className: 'xq-dock-head' }, [
      el('span', { key: 'logo', className: 'xq-logo' }, [el('b', { key: 'b' }, '雪球'), ' mini']),
      el('span', { key: 'st', className: 'xq-status', title: 'A股/港股/美股交易时段（本地时区推算，不含节假日）' }, sessionsText() || '行情面板'),
      el(PnlChip, { key: 'pnl' }),
      el('span', { key: 'hint', className: 'xq-update' }, '已嵌入输入框上方 · Esc 收起'),
      el('span', { key: 'sp', className: 'xq-spacer' }),
      // 隐身：一个按钮把三个常驻入口一起关掉（不是收起 —— 收起只关面板，徽章和指数条还在）。
      // 顺带在用户手势里请求一次通知权限（定时器里请求常被浏览器直接拒绝），保证隐身期间到价还能提醒。
      el('button', {
        key: 'hide', className: 'xq-btn-mini', title: '完全隐藏行情：面板、徽章、指数条一起消失，行情请求随之停止（价格提醒仍然生效）。恢复：Ctrl/⌘+Alt+Shift+X（可在 设置→通用→快捷键 改键），或对 AI 说「把行情打开」',
        onClick: function () { ensureAlertPermission(); ui.set({ hidden: true }) }
      }, '隐身'),
      el('button', { key: 'min', className: 'xq-btn-mini', title: '收起（点右下角徽章重新打开）', onClick: function () { ui.set({ open: false }) } }, '收起 —')
    ]),
    el('div', { key: 'body', className: 'xq-dock-body', style: bodyStyle }, [
      el(XueqiuPanel, { key: 'panel' })
    ]),
    el('div', {
      key: 'rs', className: 'xq-dock-resize', title: '拖动调整面板高度（双击复位）',
      onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp,
      onDoubleClick: function () { ui.set({ dockH: null }) }
    }, [el('span', { key: 'g' }, null)])
  ])
}

// 底部指数条（会话页，输入框下方氛围行）。
// 除指数外还常驻一条「今日盈亏」：面板收起时（DockGate 直接返回 null）头部 chip 是看不到的，
// 而这条氛围行始终在，所以它是「收起面板也能看到盈亏」的唯一落点。
// 与头部 chip 共用同一个 PnlChip（也就共用同一个轮询器，见 store/positions.js 的引用计数）。

// ---------- 独占一行：宿主那条 .dock 是「不换行的 flex 行」 ----------
// 指数条注册在 conversation.composer.dock，宿主把它铺在输入框下方那条 .dock 行里
// （display:flex / 不换行 / justify-content:center），于是指数条和宿主自己的统计文字
// （"N 轮 M 步 · tok/s"、"… 缓存命中 96%"、成本插件的"本会话 ¥0…"）挤在同一行。
//
// 两个实测坑（都踩过，别再犯）：
//   1. 宿主给槽位条目外面套了一层**无 class、display:contents** 的 div。这一层自己不生成盒子
//      （getBoundingClientRect 全 0、给它设 flex-wrap 完全无效），真正的 flex 容器还要再往上一层。
//      所以不能拿 node.parentElement 当行容器，要沿父链跳过 display:contents 的透明层。
//   2. 只写「自己占满 100% 宽」而不让那一行换行，会把宿主那些可收缩的统计文字挤成 0 宽（比不改更糟）。
//      所以这里改完**当场自检**：自己必须真的落到另一行、且没有任何兄弟被挤成 0 宽，否则原样撤回。
//      撤回与改动在同一个 effect 内完成（中间强制读一次布局），浏览器不会画出中间态。
function flexRowOf(node) {
  let p = node.parentElement
  for (let i = 0; p && i < 8; i++) {
    let d = ''
    try { d = getComputedStyle(p).display || '' } catch (e) { return null }
    if (d.indexOf('flex') >= 0) return p
    if (d !== 'contents') return null   // 只跳过 display:contents 的透明层，别的祖先一律不碰
    p = p.parentElement
  }
  return null
}

// 真正的 flex 条目：行容器的子元素，遇到 display:contents 的透明层就展开它的子元素。
function flexItemsOf(row, depth) {
  const out = []
  const kids = row.children
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i]
    let d = ''
    try { d = getComputedStyle(c).display || '' } catch (e) { d = '' }
    if (d === 'contents' && depth < 3) {
      const inner = flexItemsOf(c, depth + 1)
      for (let j = 0; j < inner.length; j++) out.push(inner[j])
    } else {
      out.push(c)
    }
  }
  return out
}

function ownLine(node) {
  if (typeof getComputedStyle !== 'function' || typeof node.getBoundingClientRect !== 'function') return
  const row = flexRowOf(node)
  if (!row) return
  const prev = {
    wrap: row.style.flexWrap, align: row.style.alignSelf,
    flex: node.style.flex, order: node.style.order
  }
  function restore() {
    row.style.flexWrap = prev.wrap
    row.style.alignSelf = prev.align
    node.style.flex = prev.flex
    node.style.order = prev.order
  }
  // 自己是否已经在另一行、且没把兄弟挤没
  function settled() {
    const a = node.getBoundingClientRect()
    const items = flexItemsOf(row, 0)
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it === node) continue
      const r = it.getBoundingClientRect()
      if (r.width < 1) return false                                        // 兄弟被挤成 0 宽
      if (!(a.bottom <= r.top || r.bottom <= a.top)) return false          // 垂直有重叠 = 还在同一行
    }
    return true
  }
  function attempt(stretch) {
    row.style.flexWrap = 'wrap'          // 让这一行可以换行（宿主自己没设过 flex-wrap）
    if (stretch) {
      // 行容器是「居中收缩」的（父级是 align-items:center 的 column flex）时，宽度由内容决定，
      // 百分比 flex-basis 可能解析不出确定值而换不了行；stretch 让这一行拿到确定宽度（视觉不变，
      // 因为它的 justify-content 本来就是 center）。
      let dir = ''
      try { dir = getComputedStyle(row.parentElement).flexDirection || '' } catch (e) { dir = '' }
      if (dir.indexOf('column') === 0) row.style.alignSelf = 'stretch'
    }
    node.style.flex = '1 0 100%'         // 自己占满一整行
    node.style.order = '9'               // 排到最后：宿主原有统计行不动，指数条落到下面一行
    return settled()
  }
  if (!attempt(false) && !attempt(true)) { restore(); return }
  return restore
}

// ---------- 底部指数条（会话页，输入框下方氛围行） ----------
// 门控：水合完成前不挂载（否则刷新瞬间会先按默认参数请求一次指数），行情隐身时返回 null。
// 注意这个 null 不是「不显示」而是「不存在」—— usePnlState 的订阅也随之消失，
// 持仓/盈亏那条轮询器的 refs 归零、定时器停掉，这才是「零请求」的来源。
function Ticker() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [, force] = React.useState(0)
  React.useEffect(function () {
    hydrateUi()
    const off = ui.subscribe(function () { force(function (x) { return x + 1 }) })
    return off
  }, [])
  if (!ui.hydrated || ui.hidden) return null
  return el(TickerBody, null)
}

function TickerBody() {
  const rt = getUiRuntime()
  const ui = rt.ui
  const [indices, setIndices] = React.useState([])
  const pnl = usePnlState()
  const requestSeq = React.useRef(0)
  const rootRef = React.useRef(null)
  React.useEffect(function () {
    let alive = true
    function refresh() {
      // 底部行情条持续读取，隐藏页的浏览器 timer 可能仍被节流。
      const my = ++requestSeq.current
      fetchIndices().then(function (data) {
        if (alive && requestSeq.current === my) setIndices((data && data.list) || [])
      }).catch(function () { /* 静默失败 */ })
    }
    function onVis() { refresh() }
    refresh()
    const stop = rt.ctx.interval(refresh, POLL_TICKER_MS)
    try { document.addEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    return function () {
      alive = false; if (stop) stop()
      try { document.removeEventListener('visibilitychange', onVis) } catch (e) { /* ignore */ }
    }
  }, [])
  // 指数拉不到时不再整条消失：只要盈亏还有东西可说，这一行就有意义。
  const showPnl = pnl.data !== null || pnl.status === 'loading' || pnl.status === 'error'
  const hasRow = indices.length > 0 || showPnl
  // 这一行真的挂上 DOM 之后（hasRow 由 false 变 true）才做独占一行处理；
  // 依赖 hasRow 而不是 []：首次渲染没数据时返回 null、根本没有节点可处理。
  React.useEffect(function () {
    const node = rootRef.current
    if (!node) return
    return ownLine(node)
  }, [hasRow])
  if (!hasRow) return null
  const kids = indices.map(function (q) {
    return el('span', { key: q.symbol, className: 'xq-tick' }, [
      el('span', { key: 'n', className: 'xq-tick-name' }, q.name),
      el('span', { key: 'c', className: 'xq-tick-cur ' + colorOf(q.percent) }, fmt(q.current)),
      el('span', { key: 'p', className: colorOf(q.percent) }, fmtPct(q.percent))
    ])
  })
  if (showPnl) kids.push(el(PnlChip, { key: 'pnl' }))
  return el('div', { className: 'xq-ticker', ref: rootRef, onClick: function () { ui.set({ open: true }) } }, kids)
}

// 槽位注册：7 次 slots.inject/register 集中成一张表（顺序即契约，与重构前一一对应）。

// ---------- 注册 ----------
const XQ_SLOT_REGISTRATIONS = [
  { slot: SLOT_TOOLVIEW, options: { name: SLOT_TOOLVIEW, key: TOOLVIEW_KEYS.quote }, render: function (props) { return el(QuoteCard, props) } },
  { slot: SLOT_TOOLVIEW, options: { name: SLOT_TOOLVIEW, key: TOOLVIEW_KEYS.kline }, render: function (props) { return el(KlineCard, props) } },
  { slot: SLOT_TOOLVIEW, options: { name: SLOT_TOOLVIEW, key: TOOLVIEW_KEYS.hot }, render: function (props) { return el(HotCard, props) } },
  { slot: SLOT_TOOLVIEW, options: { name: SLOT_TOOLVIEW, key: TOOLVIEW_KEYS.news }, render: function (props) { return el(NewsCard, props) } },
  { slot: SLOT_INPUT_DOCK, options: { name: SLOT_INPUT_DOCK, id: PANEL_ID, order: PANEL_ORDER }, render: function () { return el(DockGate, null) } },
  { slot: SLOT_OVERLAY, options: { name: SLOT_OVERLAY, id: BADGE_ID }, render: function () { return el(MiniBadge, null) } },
  { slot: SLOT_COMPOSER_DOCK, options: { name: SLOT_COMPOSER_DOCK, id: TICKER_ID, order: TICKER_ORDER }, render: function () { return el(Ticker, null) } }
]

function installSlots(ctx) {
  const slots = ctx.get('slots')
  if (slots === undefined) return
  for (let i = 0; i < XQ_SLOT_REGISTRATIONS.length; i++) {
    const reg = XQ_SLOT_REGISTRATIONS[i]
    slots.inject(reg.slot, function () {
      return slots.register(reg.options, reg.render)
    })
  }
}

// 应用级快捷键：行情「隐身」的恢复入口之一（另一个是 xueqiu_display 工具，让 AI 拨开关）。
//
// 为什么用宿主的快捷键服务而不是自己监听 keydown：
//   · 命令会出现在 设置 → 通用 → 快捷键 里 —— 用户能看见键帽、能改键，也能在撞键时自己换一个；
//   · 宿主统一处理焦点区域/输入框/弹窗的仲裁，不会在终端、输入框里误触发；
//   · 隐身之后屏幕上什么都没有，这条「看不见但要记得住」的入口必须是可发现、可改的。
//
// 降级链：shortcuts 服务不存在 → 什么都不做（仍可让 AI 打开）；
//        默认键位与既有命令冲突导致 register 抛错 → 退化为「未绑定」再注册一次，
//        命令照样出现在快捷键表里等用户指派，比彻底没有入口好。

// primary = macOS 上的 ⌘ / 其它平台的 Ctrl。三修饰键 + X：正常输入与常见全局快捷键都不会占用。
const BINDING_PROFILES = ['web:windows', 'web:macos', 'web:linux', 'desktop:windows', 'desktop:macos', 'desktop:linux']

function binding() { return { code: 'KeyX', modifiers: ['primary', 'alt', 'shift'] } }

function makeCommand(withDefaults) {
  const defaults = {}
  if (withDefaults) for (let i = 0; i < BINDING_PROFILES.length; i++) defaults[BINDING_PROFILES[i]] = binding()
  return {
    id: XQ_SHORTCUT_TOGGLE_HIDDEN,
    label: function () { return '雪球行情：显示 / 隐身' },
    aliases: ['xueqiu hidden', '雪球隐身', '行情隐身', '隐藏行情'],
    defaults: defaults,
    // editable 也要放行：用户可能正停在输入框里想「把行情关掉」，此时 region='editable'。
    regions: ['page', 'editable'],
    modals: [],
    resolve: function () {
      return { status: 'handled', run: function () { toggleUiHidden() } }
    }
  }
}

function registerCommand(shortcuts) {
  try {
    return shortcuts.register(makeCommand(true))
  } catch (e) {
    try {
      return shortcuts.register(makeCommand(false))
    } catch (e2) {
      return function () {}
    }
  }
}

function installShortcuts(ctx) {
  try {
    if (typeof ctx.inject !== 'function') return
    ctx.inject(['shortcuts'], function (scoped) {
      const shortcuts = scoped && scoped.shortcuts
      if (!shortcuts || typeof shortcuts.register !== 'function') return
      scoped.effect(function () { return registerCommand(shortcuts) })
    })
  } catch (e) { /* 宿主没有快捷键服务：隐身仍可经 xueqiu_display 工具恢复 */ }
}

// 入口：apply 薄壳（插样式 → 建运行时 → 装槽位/快捷键）+ 默认导出。
// 样式在 apply 开头只插一次；ui store / saveUi / hydratePromise / 拖拽引用等「每次 apply 一份」
// 的状态由 createUiRuntime 重建（见 store/ui.js 的运行时持有者说明）。

const xqClientPlugin = {
  inject: ['timer'],
  apply(ctx) {
    styles.insert(`
.xq-tv-shell{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:8px 10px;margin:4px 0;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);min-width:0;}
.xq-tv-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;}
.xq-tv-title{font-weight:700;}
.xq-tv-pill{font-size:11px;padding:1px 7px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.xq-tv-table{display:flex;flex-direction:column;gap:2px;}
.xq-tv-row{display:flex;align-items:baseline;gap:10px;padding:2px 4px;border-radius:6px;}
.xq-tv-row:hover{background:var(--dsw-alias-bg-layer-2);}
.xq-tv-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.xq-tv-code{color:var(--dsw-alias-label-tertiary);font-size:11px;}
.xq-tv-price{font-weight:700;font-variant-numeric:tabular-nums;}
.xq-tv-pct{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap;}
.xq-tv-shell svg{max-width:100%;height:auto;display:block;}
.xq-tv-rank{width:22px;flex:none;text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);font-size:12px;}
.xq-tv-rankup{color:var(--dsw-alias-state-error-primary);font-size:11px;flex:none;font-variant-numeric:tabular-nums;}
.xq-tv-rankdn{color:var(--dsw-alias-state-success-primary);font-size:11px;flex:none;font-variant-numeric:tabular-nums;}
.xq-tv-news{display:flex;flex-direction:column;gap:1px;max-height:300px;overflow-y:auto;}
.xq-tv-item{display:flex;gap:8px;align-items:baseline;padding:2px 4px;border-radius:6px;}
.xq-tv-item:hover{background:var(--dsw-alias-bg-layer-2);}
.xq-tv-mark{background:var(--dsw-alias-bg-layer-2);}
.xq-tv-time{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}
.xq-tv-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.xq-tv-flag{color:var(--dsw-alias-state-error-primary);font-weight:700;}
.xq-up{color:var(--dsw-alias-state-error-primary);}
.xq-down{color:var(--dsw-alias-state-success-primary);}
.xq-dock{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden;font-size:13px;line-height:1.45;color:var(--dsw-alias-label-primary);margin-bottom:6px;}
.xq-dock *{box-sizing:border-box;}
.xq-dock-head{display:flex;align-items:center;gap:8px;padding:7px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);}
.xq-dock-body{height:52vh;max-height:80vh;overflow-y:auto;padding:8px 12px 10px;}
.xq-dock-resize{display:flex;align-items:center;justify-content:center;height:12px;cursor:ns-resize;user-select:none;border-top:1px solid var(--dsw-alias-border-l1);}
.xq-dock-resize span{display:block;width:36px;height:3px;border-radius:2px;background:var(--dsw-alias-border-l2);}
.xq-badge{position:fixed;right:16px;bottom:64px;display:flex;flex-direction:column;align-items:stretch;gap:6px;padding:8px 12px;border-radius:14px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 6px 24px rgba(0,0,0,.25);font-size:11.5px;line-height:1.4;color:var(--dsw-alias-label-primary);cursor:grab;user-select:none;pointer-events:auto;z-index:1200;}
.xq-badge:active{cursor:grabbing;}
.xq-badge b{color:var(--dsw-alias-brand-primary);}
.xq-badge-val{font-weight:700;}
.xq-badge-hint{color:var(--dsw-alias-label-secondary);}
.xq-logo{font-weight:700;font-size:14px;letter-spacing:.5px;white-space:nowrap;}
.xq-logo b{color:var(--dsw-alias-brand-primary);}
.xq-update{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.xq-status{font-size:10px;padding:1px 6px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.xq-status.xq-live{color:var(--dsw-alias-state-error-primary);}
.xq-spacer{flex:1;}
.xq-btn{font-size:12px;padding:2px 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);cursor:pointer;}
.xq-btn:hover{border-color:var(--dsw-alias-brand-primary);}
.xq-btn:disabled{opacity:.5;cursor:default;}
.xq-btn-mini{font-size:11px;padding:1px 8px;border-radius:5px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;line-height:1.4;}
.xq-btn-mini:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary);}
.xq-tabs{display:flex;gap:4px;align-items:center;border-bottom:1px solid var(--dsw-alias-border-l1);margin-bottom:8px;}
.xq-tab{font-size:13px;padding:5px 12px;border:none;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;border-bottom:2px solid transparent;}
.xq-tab:hover{color:var(--dsw-alias-label-primary);}
.xq-tab-active{color:var(--dsw-alias-brand-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600;}
.xq-idx{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
.xq-idx-card{flex:1;min-width:120px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 8px;cursor:pointer;}
.xq-idx-card:hover{border-color:var(--dsw-alias-brand-primary);}
.xq-sort-h{cursor:pointer;user-select:none;}
.xq-sort-h:hover{color:var(--dsw-alias-label-primary);}
.xq-sort-on{color:var(--dsw-alias-label-primary);font-weight:600;}
.xq-idx-name{font-size:11px;color:var(--dsw-alias-label-secondary);}
.xq-idx-row{display:flex;align-items:baseline;gap:6px;}
.xq-idx-cur{font-size:14px;font-weight:700;}
.xq-idx-pct{font-size:11px;}
.xq-up{color:var(--dsw-alias-state-error-primary);}
.xq-down{color:var(--dsw-alias-state-success-primary);}
.xq-flat{color:var(--dsw-alias-label-secondary);}
/* 专业感三件套：①等宽数字 ②涨跌幅色块 ③价格闪烁 */
.xq-dock,.xq-badge,.xq-ticker{font-variant-numeric:tabular-nums;}
.xq-pct-chip{display:inline-block;min-width:52px;text-align:center;padding:1px 6px;border-radius:5px;font-size:11.5px;font-weight:600;}
.xq-pct-chip.xq-up{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);}
.xq-pct-chip.xq-down{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);}
.xq-pct-chip.xq-flat{background:var(--dsw-alias-bg-layer-2);}
.xq-idx-pct.xq-pct-chip{min-width:46px;padding:0 5px;font-size:10.5px;}
@keyframes xq-flash-up{0%{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent);}100%{background:transparent;}}
@keyframes xq-flash-down{0%{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent);}100%{background:transparent;}}
.xq-flash-up{animation:xq-flash-up .8s ease-out;}
.xq-flash-down{animation:xq-flash-down .8s ease-out;}
/* 微交互：内容切换淡入 + 刷新按钮旋转 */
@keyframes xq-fade-in{from{opacity:0;transform:translateY(3px);}to{opacity:1;transform:none;}}
.xq-view{animation:xq-fade-in .18s ease-out;}
@keyframes xq-spin{to{transform:rotate(360deg);}}
.xq-refresh-spin{display:inline-block;animation:xq-spin .8s linear infinite;}
.xq-tab{transition:color .15s,border-color .15s;}
/* 快讯时间轴：左侧竖线 + 时间锚点分组 */
.xq-news-tl{position:relative;padding-left:14px;}
.xq-news-tl::before{content:"";position:absolute;left:4px;top:6px;bottom:6px;width:1px;background:var(--dsw-alias-border-l2);}
.xq-news-group{font-size:10.5px;color:var(--dsw-alias-label-secondary);margin:8px 0 5px;display:flex;align-items:center;gap:6px;}
.xq-news-group::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-border-l2);margin-left:-13px;flex:none;}
.xq-news-item{position:relative;}
/* 徽章 hover 预览弹层 */
/* 徽章区域模式：右下角宽度调节手柄（⤡），拖动横向改变宽度 */
.xq-badge-grip{position:absolute;right:2px;bottom:2px;width:16px;height:16px;cursor:ew-resize;display:flex;align-items:flex-end;justify-content:flex-end;color:var(--dsw-alias-label-secondary);font-size:9px;line-height:1;opacity:0;transition:opacity .15s;}
.xq-badge:hover .xq-badge-grip{opacity:.85;}
.xq-badge-hd{display:flex;align-items:center;gap:8px;}
.xq-badge-compact{width:auto;max-width:180px;padding:5px 8px;border-radius:999px;gap:0;}
.xq-badge-compact .xq-badge-hd{gap:6px;white-space:nowrap;}
.xq-badge-control{flex:none;width:18px;height:18px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:50%;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:16px;text-align:center;cursor:pointer;}
.xq-badge-control:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary);}
.xq-badge-control:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}
/* 行情隐身时左下角唯一可见的痕迹：小胶囊，点一下恢复全部行情界面。
   固定定位、不参与任何布局，也不发请求 —— 「隐身=零请求」这条不变量不受影响。 */
.xq-restore{position:fixed;left:12px;bottom:12px;z-index:1200;display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.4;cursor:pointer;user-select:none;opacity:.6;transition:opacity .15s,border-color .15s,color .15s;}
.xq-restore:hover{opacity:1;border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary);}
.xq-restore:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;}
.xq-restore-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary);opacity:.55;flex:none;}
.xq-restore:hover .xq-restore-dot{opacity:1;}
.xq-wgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 12px;padding:1px 8px 1px 0;}
.xq-witem{white-space:nowrap;display:flex;justify-content:space-between;gap:6px;}
.xq-witem .xq-badge-hint{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;}
.xq-idxgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 12px;padding-bottom:5px;border-bottom:1px solid var(--dsw-alias-border-l2);}
.xq-idxrow{display:flex;justify-content:space-between;gap:6px;white-space:nowrap;}
.xq-grid{display:grid;gap:0;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:hidden;margin-bottom:8px;}
.xq-grid-hd,.xq-grid-row{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr 84px;align-items:center;}
.xq-grid-hd{font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);padding:5px 8px;}
.xq-grid-row{padding:6px 8px;border-top:1px solid var(--dsw-alias-border-l1);cursor:pointer;font-size:12.5px;}
.xq-grid-row:hover{background:var(--dsw-alias-bg-layer-2);}
.xq-name{font-weight:600;}
.xq-sub{font-size:10.5px;color:var(--dsw-alias-label-secondary);}
.xq-muted{font-size:12px;color:var(--dsw-alias-label-secondary);}
.xq-err{font-size:12px;color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:5px 8px;margin-bottom:6px;}
.xq-alert-notice{font-size:12px;color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-state-warn-primary);border-radius:7px;padding:6px 8px;margin-bottom:7px;}
.xq-alert-event{display:flex;align-items:center;gap:8px;margin-top:4px;}
.xq-alert-event>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.xq-actions{display:flex;gap:4px;justify-content:flex-end;align-items:center;flex-wrap:wrap;}
.xq-alert-editor{display:inline-flex;align-items:center;gap:3px;white-space:nowrap;}
.xq-alert-dir,.xq-alert-target{font-size:11px;height:21px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.xq-alert-dir{width:34px;padding:1px;}
.xq-alert-target{width:60px;padding:1px 4px;}
.xq-input{font-size:12.5px;padding:4px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.xq-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary);}
.xq-search-row{display:flex;gap:6px;margin-bottom:8px;}
.xq-search-row .xq-input{flex:1;}
.xq-seg{display:inline-flex;gap:2px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:1px;}
.xq-seg button{font-size:11.5px;border:none;background:none;color:var(--dsw-alias-label-secondary);padding:2px 8px;border-radius:5px;cursor:pointer;}
.xq-seg button.xq-seg-on{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600;}
.xq-news{display:flex;flex-direction:column;gap:7px;max-height:380px;overflow-y:auto;}
.xq-news-item{font-size:12.5px;padding:6px 8px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:7px;}
.xq-news-item.xq-important{border-left:3px solid var(--dsw-alias-state-warn-primary);}
.xq-news-time{font-size:10.5px;color:var(--dsw-alias-label-secondary);margin-top:3px;}
.xq-news-more{font-size:11.5px;color:var(--dsw-alias-label-secondary);text-align:center;padding:6px 0 2px;cursor:pointer;user-select:none;}
.xq-news-more:hover{color:var(--dsw-alias-label-primary);}
.xq-detail-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;}
.xq-detail-name{font-size:16px;font-weight:700;letter-spacing:.2px;}
.xq-detail-code{font-size:11px;color:var(--dsw-alias-label-tertiary);letter-spacing:.3px;}
.xq-detail-price{display:flex;align-items:baseline;gap:10px;}
.xq-detail-delta{display:flex;align-items:baseline;gap:6px;}
.xq-detail-cur{font-size:27px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;}
.xq-detail-chg{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;}
.xq-detail-pct{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;}
.xq-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;}
.xq-stat{background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 55%, transparent);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 8px;min-width:0;}
.xq-stat-k{font-size:10px;color:var(--dsw-alias-label-tertiary);margin-bottom:3px;letter-spacing:.2px;}
.xq-stat-v{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.xq-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 12px;margin-bottom:12px;}
.xq-card-t{font-size:12.5px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.xq-card-t::before{content:"";width:3px;height:12px;border-radius:2px;background:var(--dsw-alias-brand-primary);flex:none;}
.xq-periods{display:inline-flex;flex-wrap:wrap;gap:2px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:2px;background:var(--dsw-alias-bg-layer-2);}
.xq-periods button,.xq-modes button{font-size:11.5px;border:none;background:none;color:var(--dsw-alias-label-secondary);padding:3px 9px;border-radius:6px;cursor:pointer;transition:color .12s,background .12s;}
.xq-periods button:hover,.xq-modes button:hover{color:var(--dsw-alias-label-primary);}
.xq-periods button.xq-on,.xq-modes button.xq-on{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);color:var(--dsw-alias-brand-primary);font-weight:700;}
.xq-chart{width:100%;height:auto;display:block;}
.xq-chart-pan{cursor:crosshair;touch-action:none;}
.xq-chart-pan:active{cursor:grabbing;}
.xq-chart-wrap{position:relative;}
.xq-tip{position:absolute;top:4px;z-index:5;pointer-events:none;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px;font-size:10.5px;line-height:1.6;color:var(--dsw-alias-label-primary);box-shadow:0 4px 14px rgba(0,0,0,.28);white-space:nowrap;}
.xq-tip-d{font-weight:700;}
.xq-tip-r{display:flex;gap:8px;}
.xq-tip-k{color:var(--dsw-alias-label-secondary);}
.xq-chart-labels{display:flex;justify-content:space-between;font-size:10.5px;color:var(--dsw-alias-label-tertiary);margin-top:3px;}
.xq-ma-legend{display:flex;gap:10px;font-size:10.5px;color:var(--dsw-alias-label-secondary);}
.xq-klc{height:300px;width:100%;min-width:0;cursor:grab;}
.xq-klc.xq-dragging{cursor:grabbing;}
.xq-klc-min{height:230px;}
.xq-kol{display:flex;flex-wrap:wrap;gap:6px;}
.xq-kol-chip{font-size:12px;padding:4px 10px;border-radius:14px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);cursor:pointer;}
.xq-kol-chip:hover{border-color:var(--dsw-alias-brand-primary);}
.xq-verif{font-size:9.5px;color:var(--dsw-alias-brand-primary);margin-left:4px;}
.xq-hot-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);cursor:pointer;}
.xq-hot-row:last-child{border-bottom:none;}
.xq-hot-row:hover{background:var(--dsw-alias-bg-layer-2);}
.xq-rank{font-size:12px;font-weight:700;width:20px;text-align:center;color:var(--dsw-alias-label-secondary);}
.xq-ticker{display:flex;gap:14px;font-size:11px;color:var(--dsw-alias-label-secondary);padding:2px 2px;flex-wrap:wrap;justify-content:center;cursor:pointer;}
.xq-ticker:hover{color:var(--dsw-alias-label-primary);}
.xq-tick{display:inline-flex;gap:5px;align-items:baseline;}
.xq-tick-name{color:var(--dsw-alias-label-secondary);}
.xq-tick-cur{font-weight:600;}
/* 指数条里复用的盈亏 chip：跟氛围行正文排版走，去掉面板头部那种药丸底色与内边距 */
.xq-ticker .xq-pnl-chip{background:none;padding:0;max-width:none;font-size:11px;}
.xq-ticker .xq-pnl-chip.xq-pnl-up,.xq-ticker .xq-pnl-chip.xq-pnl-down{font-weight:600;}
.xq-caret{font-size:11px;color:var(--dsw-alias-label-secondary);flex-shrink:0;}
.xq-loading{font-size:12px;color:var(--dsw-alias-label-secondary);padding:12px 0;text-align:center;}
/* 账号登录（可选）：粘贴浏览器 Cookie 启用云端自选股 */
.xq-acc-btn.xq-acc-on{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent);color:var(--dsw-alias-brand-primary);}
.xq-login{display:flex;flex-direction:column;gap:9px;max-width:560px;}
.xq-login-hd{font-size:13.5px;font-weight:700;}
.xq-login-tip{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.7;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:7px 10px;}
.xq-login-tip b{color:var(--dsw-alias-label-primary);}
.xq-login-tip ol{margin:4px 0 0;padding-left:18px;}
.xq-login-tip a{color:var(--dsw-alias-brand-primary);}
.xq-login textarea{font-size:11.5px;font-family:ui-monospace,Menlo,monospace;width:100%;min-height:64px;resize:vertical;padding:6px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.xq-login textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary);}
.xq-login-msg{font-size:12px;}
.xq-login-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.xq-login-user{font-size:12.5px;color:var(--dsw-alias-label-primary);}
.xq-login-ok{color:var(--dsw-alias-state-success-primary);}
.xq-login-bad{color:var(--dsw-alias-state-warn-primary);}
.xq-acc-mark{font-size:10px;color:var(--dsw-alias-label-secondary);}
/* 今日盈亏（同花顺投资账本）：头部常驻 chip + 「盈亏」tab。
   配色沿用既有变量，A 股习惯「涨红跌绿」：up 用 state-error-primary、down 用 state-success-primary。 */
.xq-pnl-chip{display:inline-flex;align-items:baseline;gap:4px;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer;font-variant-numeric:tabular-nums;transition:color .15s;max-width:300px;overflow:hidden;text-overflow:ellipsis;}
.xq-pnl-chip:hover{color:var(--dsw-alias-label-primary);}
.xq-pnl-chip.xq-pnl-up{color:var(--dsw-alias-state-error-primary);font-weight:600;}
.xq-pnl-chip.xq-pnl-down{color:var(--dsw-alias-state-success-primary);font-weight:600;}
.xq-pnl-chip.xq-pnl-bad{color:var(--dsw-alias-state-warn-primary);}
.xq-pnl-tag{font-size:10px;color:var(--dsw-alias-label-tertiary);font-weight:400;}
.xq-pnl{display:flex;flex-direction:column;gap:9px;max-width:560px;}
.xq-pnl-hero{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
.xq-pnl-amt{font-size:26px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums;}
.xq-pnl-pct{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;}
.xq-pnl-up{color:var(--dsw-alias-state-error-primary);}
.xq-pnl-down{color:var(--dsw-alias-state-success-primary);}
.xq-pnl-dim{color:var(--dsw-alias-label-secondary);}
.xq-pnl-ok{color:var(--dsw-alias-state-success-primary);}
.xq-pnl-bad{color:var(--dsw-alias-state-warn-primary);}
.xq-pnl-meta{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}
.xq-pnl-block{display:flex;flex-direction:column;gap:6px;}
.xq-pnl-sec{font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:8px;}
.xq-pnl-sec::before{content:"";width:3px;height:12px;border-radius:2px;background:var(--dsw-alias-brand-primary);flex:none;}
.xq-pnl-field{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.xq-pnl-field label{font-size:12px;color:var(--dsw-alias-label-secondary);flex:none;}
.xq-pnl-sel{font-size:12.5px;padding:3px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);max-width:100%;}
.xq-pnl-num{font-size:12.5px;width:88px;padding:3px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;}
.xq-pnl-num:focus,.xq-pnl-sel:focus{outline:none;border-color:var(--dsw-alias-brand-primary);}
.xq-pnl-ta{font-size:11.5px;font-family:ui-monospace,Menlo,monospace;width:100%;min-height:64px;resize:vertical;padding:6px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.xq-pnl-ta:focus{outline:none;border-color:var(--dsw-alias-brand-primary);}
.xq-pnl-note{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.6;}
.xq-pnl-sub{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);}
.xq-pnl-sub.xq-pnl-bad{color:var(--dsw-alias-state-warn-primary);}
.xq-pnl-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.xq-pnl-msg{font-size:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
/* ---- 持仓（同花顺账本持仓明细）：账户合计 + 逐只持仓表 ---- */
.xq-pos-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:8px;}
/* 数值单元格。注意：这里声明了 color —— 任何与 .xq-pos-num 组合的状态色（.xq-up/.xq-down/.xq-flat）
   都不能只写单类（优先级相同、后写的赢，本行在后面会把它盖掉），必须像 .xq-pos-chg.xq-up 那样用复合选择器。 */
.xq-pos-num{font-variant-numeric:tabular-nums;font-size:12.5px;color:var(--dsw-alias-label-primary);white-space:nowrap;}
.xq-pos-head{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;}
.xq-pos-title{font-size:11.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}
.xq-pos-stale{font-size:10px;padding:1px 6px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 16%,transparent);color:var(--dsw-alias-state-warn-primary);white-space:nowrap;}
.xq-pos-head .xq-btn-mini{margin-left:0;}
.xq-pos-head .xq-spacer{flex:1 1 auto;}
/* 8 列：名称/代码 · 股数 · 成本价 · 现价 · 当日涨跌 · 市值 · 持仓盈亏 · 操作。
   面板可能比 520px 窄，所以给栅格兜底最小宽度 + 容器横向滚动（表头与行同处一个滚动容器）。 */
.xq-pos-table{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow-x:auto;overflow-y:hidden;margin-bottom:8px;scrollbar-width:thin;}
.xq-pos-grid{display:grid;grid-template-columns:minmax(0,1.5fr) .75fr .85fr .75fr .95fr .95fr 1fr auto;gap:6px;align-items:center;padding:5px 8px;min-width:560px;}
.xq-pos-hd{background:var(--dsw-alias-bg-layer-2);font-size:11px;color:var(--dsw-alias-label-secondary);}
.xq-pos-row{border-top:1px solid var(--dsw-alias-border-l1);font-size:12.5px;}
.xq-pos-row:hover{background:var(--dsw-alias-bg-layer-2);}
.xq-pos-r{text-align:right;}
/* 涨跌单元是两行（金额 / 涨跌幅）且要整体右对齐，所以外层做成 flex 列、内层再右对齐。 */
.xq-pos-cell{display:flex;flex-direction:column;align-items:flex-end;min-width:0;}
.xq-pos-chg{text-align:right;}
/* 涨跌配色必须写成**复合选择器**（两个类），不能只靠 .xq-up / .xq-down：
   它们与 .xq-pos-num（第 233 行，声明了 color）同为单类选择器、优先级相同，而 .xq-pos-num 在本文件里
   更靠后 —— 「后写的赢」会把涨跌色盖掉。真实事故：className 里 xq-up/xq-down 都在，界面上却全是默认深色。
   复合选择器优先级更高，与书写顺序解耦（.xq-pos-num 的默认前景色因此不必为配色让路）。 */
.xq-pos-chg.xq-up{color:var(--dsw-alias-state-error-primary);}
.xq-pos-chg.xq-down{color:var(--dsw-alias-state-success-primary);}
.xq-pos-chg.xq-flat{color:var(--dsw-alias-label-secondary);}
.xq-pos-amt{font-weight:600;}
/* 已清仓（账本保留 qty=0 的行记已实现盈亏）：整行压暗，避免和在场持仓混淆。 */
.xq-pos-cleared{opacity:.7;}
.xq-pos-cleared:hover{opacity:1;}
.xq-pos-cleared .xq-pos-days{color:var(--dsw-alias-state-warn-primary);}
.xq-pos-name{display:flex;flex-direction:column;min-width:0;line-height:1.35;}
.xq-pos-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.xq-pos-code{font-size:10px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}
.xq-pos-days{font-size:9.5px;color:var(--dsw-alias-label-tertiary);}
.xq-pos-cost{color:var(--dsw-alias-brand-primary);}
.xq-pos-rate{display:block;font-size:10.5px;opacity:.85;}
/* 数据缺口的提示（例：行情取数失败导致当日盈亏整列为 --）—— 只是提示，不当作错误。 */
.xq-pos-hint{font-size:11px;color:var(--dsw-alias-state-warn-primary);line-height:1.6;}
.xq-pos-notes{display:flex;flex-direction:column;gap:6px;}
/* ---- 持仓编辑：行内操作、新增/编辑表单、账本同步区 ---- */
.xq-pos-ops{display:flex;gap:4px;justify-content:flex-end;white-space:nowrap;}
.xq-pos-ops .xq-btn-mini{padding:0 6px;font-size:10.5px;}
.xq-pos-form{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px;margin-bottom:8px;background:var(--dsw-alias-bg-layer-2);}
.xq-pos-form-hd{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-bottom:6px;}
.xq-pos-form-row{display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end;}
.xq-pos-field{display:flex;flex-direction:column;gap:3px;min-width:0;}
.xq-pos-field-k{font-size:10.5px;color:var(--dsw-alias-label-tertiary);}
.xq-pos-input{width:100px;font-size:12px;padding:3px 6px;border-radius:5px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;}
.xq-pos-field:first-child .xq-pos-input{width:120px;}
.xq-pos-form-btns{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:8px;}
.xq-pos-sync{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px;margin-bottom:8px;display:flex;flex-direction:column;gap:6px;}

`)
    createUiRuntime(ctx)
    // 持仓/盈亏的唯一数据源：只建运行时、不取数，首个订阅者（chip / tab / 指数条）挂载时才启动轮询。
    // 它现在读的是「本地持仓 × 雪球行情」的宿主现算视图 —— 账本凭据坏了也不影响实时数字。
    createPositionsRuntime(ctx)
    // 价格提醒的系统通知器：**应用级、随 apply 启动**，与面板挂载和行情隐身都无关
    // （宿主侧 watcher 独立判定阈值，这里只负责把新事件弹成通知）。见 store/alerts-watch.js。
    createAlertsWatchRuntime(ctx).start()
    installSlots(ctx)
    // 行情隐身的恢复入口：快捷键（设置里可改键）。没有这个服务时仍可让 AI 用 xueqiu_display 打开。
    installShortcuts(ctx)
  }
}



    exports.default = xqClientPlugin
    return module.exports
  }
})
