export default {
    async fetch(request, env) {
        // By returning the result of ASSETS.fetch, we delegate asset serving to Pages.
        // This is the recommended approach for SPAs, as it respects the configuration
        // in wrangler.jsonc, including "not_found_handling": "single-page-application".
        return env.ASSETS.fetch(request);
    },
};
