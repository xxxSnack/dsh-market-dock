// 登录框（可选：粘贴浏览器 Cookie 启用云端自选股）。
// 提到模块作用域后不再靠闭包读父级 state —— 全部经显式上下文 p 传入：
//   p.login / p.cookieInput / p.setCookieInput / p.loginMsg / p.loginBusy
//   p.doLogin / p.doLogout / p.doPull / p.setLoginOpen / p.setLoginMsg
import { el } from '../dom.js'

export function LoginBox(p) {
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
