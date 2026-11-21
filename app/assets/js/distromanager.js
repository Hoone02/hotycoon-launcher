const { DistributionAPI, RestResponseStatus } = require('helios-core/common')

const ConfigManager = require('./configmanager')

// Old WesterosCraft url.
// exports.REMOTE_DISTRO_URL = 'http://mc.westeroscraft.com/WesterosCraftLauncher/distribution.json'
exports.REMOTE_DISTRO_URL = 'https://raw.githubusercontent.com/Hoone02/hotycoon-launcher-files/main/distribution.json'

const api = new DistributionAPI(
    ConfigManager.getLauncherDirectory(),
    null, // Injected forcefully by the preloader.
    null, // Injected forcefully by the preloader.
    exports.REMOTE_DISTRO_URL,
    false
)

// 호타이쿤: raw.githubusercontent.com 의 /main/ 주소는 5분 동안 캐시돼(쿼리를 붙여도 무시됨)
// 방금 올린 설정·모드가 늦게 반영된다. 런처가 켜질 때 main 의 최신 커밋 해시를 받아
// /<해시>/ 주소로 받으면 내용이 고정이라 캐시가 묵지 않는다. 실패하면 원래 /main/ 주소로 받는다.
const got = require('got')
const HOTY_REPO = 'Hoone02/hotycoon-launcher-files'
const HOTY_MAIN_PREFIX = `https://raw.githubusercontent.com/${HOTY_REPO}/main/`

async function resolveLatestCommit(){
    // git 스마트 HTTP 의 refs 광고는 캐시되지 않고 API 사용량 제한도 없다.
    const res = await got.get(`https://github.com/${HOTY_REPO}.git/info/refs?service=git-upload-pack`, {
        responseType: 'text',
        timeout: { request: 8000 },
        headers: { 'Cache-Control': 'no-cache' }
    })
    const m = /([0-9a-f]{40}) refs\/heads\/main/.exec(res.body)
    if(m == null) throw new Error('main 브랜치 해시를 찾지 못했어요.')
    return m[1]
}

/**
 * /main/ 주소를 최신 커밋 주소로 바꾼다. 해시를 못 받으면 원래 주소를 그대로 돌려준다.
 * @param {string} url raw.githubusercontent.com/<repo>/main/... 주소
 * @returns {Promise<string>}
 */
exports.resolveFreshUrl = async function(url){
    try {
        const sha = await resolveLatestCommit()
        return url.split(HOTY_MAIN_PREFIX).join(`https://raw.githubusercontent.com/${HOTY_REPO}/${sha}/`)
    } catch(err) {
        console.warn('최신 커밋 해시를 받지 못해 캐시된 주소를 써요.', err)
        return url
    }
}

const originalPullRemote = api.pullRemote.bind(api)
api.pullRemote = async function(){
    try {
        const sha = await resolveLatestCommit()
        const base = `https://raw.githubusercontent.com/${HOTY_REPO}/${sha}/`
        const res = await got.get(base + 'distribution.json', { responseType: 'text', timeout: { request: 15000 } })
        // 모드·라이브러리 주소도 같은 커밋으로 맞춰, 방금 바꾼 jar 를 옛 캐시로 받아 해시가 틀리는 일을 막는다.
        const data = JSON.parse(res.body.split(HOTY_MAIN_PREFIX).join(base))
        return { data, responseStatus: RestResponseStatus.SUCCESS }
    } catch(err) {
        console.warn('최신 커밋으로 배포 정보를 받지 못해 기본 주소로 받아요.', err)
        return originalPullRemote()
    }
}

exports.DistroAPI = api