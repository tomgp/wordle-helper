
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.45.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var shortWordList = [
      "cigar","rebut","sissy","humph","awake","blush","focal","evade","naval","serve","heath","dwarf","model","karma","stink","grade","quiet","bench","abate","feign","major","death","fresh","crust","stool","colon","abase","marry","react","batty","pride","floss","helix","croak","staff","paper","unfed","whelp","trawl","outdo","adobe","crazy","sower","repay","digit","crate","cluck","spike","mimic","pound","maxim","linen","unmet","flesh","booby","forth","first","stand","belly","ivory","seedy","print","yearn","drain","bribe","stout","panel","crass","flume","offal","agree","error","swirl","argue","bleed","delta","flick","totem","wooer","front","shrub","parry","biome","lapel","start","greet","goner","golem","lusty","loopy","round","audit","lying","gamma","labor","islet","civic","forge","corny","moult","basic","salad","agate","spicy","spray","essay","fjord","spend","kebab","guild","aback","motor","alone","hatch","hyper","thumb","dowry","ought","belch","dutch","pilot","tweed","comet","jaunt","enema","steed","abyss","growl","fling","dozen","boozy","erode","world","gouge","click","briar","great","altar","pulpy","blurt","coast","duchy","groin","fixer","group","rogue","badly","smart","pithy","gaudy","chill","heron","vodka","finer","surer","radio","rouge","perch","retch","wrote","clock","tilde","store","prove","bring","solve","cheat","grime","exult","usher","epoch","triad","break","rhino","viral","conic","masse","sonic","vital","trace","using","peach","champ","baton","brake","pluck","craze","gripe","weary","picky","acute","ferry","aside","tapir","troll","unify","rebus","boost","truss","siege","tiger","banal","slump","crank","gorge","query","drink","favor","abbey","tangy","panic","solar","shire","proxy","point","robot","prick","wince","crimp","knoll","sugar","whack","mount","perky","could","wrung","light","those","moist","shard","pleat","aloft","skill","elder","frame","humor","pause","ulcer","ultra","robin","cynic","agora","aroma","caulk","shake","pupal","dodge","swill","tacit","other","thorn","trove","bloke","vivid","spill","chant","choke","rupee","nasty","mourn","ahead","brine","cloth","hoard","sweet","month","lapse","watch","today","focus","smelt","tease","cater","movie","lynch","saute","allow","renew","their","slosh","purge","chest","depot","epoxy","nymph","found","shall","harry","stove","lowly","snout","trope","fewer","shawl","natal","fibre","comma","foray","scare","stair","black","squad","royal","chunk","mince","slave","shame","cheek","ample","flair","foyer","cargo","oxide","plant","olive","inert","askew","heist","shown","zesty","hasty","trash","fella","larva","forgo","story","hairy","train","homer","badge","midst","canny","fetus","butch","farce","slung","tipsy","metal","yield","delve","being","scour","glass","gamer","scrap","money","hinge","album","vouch","asset","tiara","crept","bayou","atoll","manor","creak","showy","phase","froth","depth","gloom","flood","trait","girth","piety","payer","goose","float","donor","atone","primo","apron","blown","cacao","loser","input","gloat","awful","brink","smite","beady","rusty","retro","droll","gawky","hutch","pinto","gaily","egret","lilac","sever","field","fluff","hydro","flack","agape","wench","voice","stead","stalk","berth","madam","night","bland","liver","wedge","augur","roomy","wacky","flock","angry","bobby","trite","aphid","tryst","midge","power","elope","cinch","motto","stomp","upset","bluff","cramp","quart","coyly","youth","rhyme","buggy","alien","smear","unfit","patty","cling","glean","label","hunky","khaki","poker","gruel","twice","twang","shrug","treat","unlit","waste","merit","woven","octal","needy","clown","widow","irony","ruder","gauze","chief","onset","prize","fungi","charm","gully","inter","whoop","taunt","leery","class","theme","lofty","tibia","booze","alpha","thyme","eclat","doubt","parer","chute","stick","trice","alike","sooth","recap","saint","liege","glory","grate","admit","brisk","soggy","usurp","scald","scorn","leave","twine","sting","bough","marsh","sloth","dandy","vigor","howdy","enjoy","valid","ionic","equal","unset","floor","catch","spade","stein","exist","quirk","denim","grove","spiel","mummy","fault","foggy","flout","carry","sneak","libel","waltz","aptly","piney","inept","aloud","photo","dream","stale","vomit","ombre","fanny","unite","snarl","baker","there","glyph","pooch","hippy","spell","folly","louse","gulch","vault","godly","threw","fleet","grave","inane","shock","crave","spite","valve","skimp","claim","rainy","musty","pique","daddy","quasi","arise","aging","valet","opium","avert","stuck","recut","mulch","genre","plume","rifle","count","incur","total","wrest","mocha","deter","study","lover","safer","rivet","funny","smoke","mound","undue","sedan","pagan","swine","guile","gusty","equip","tough","canoe","chaos","covet","human","udder","lunch","blast","stray","manga","melee","lefty","quick","paste","given","octet","risen","groan","leaky","grind","carve","loose","sadly","spilt","apple","slack","honey","final","sheen","eerie","minty","slick","derby","wharf","spelt","coach","erupt","singe","price","spawn","fairy","jiffy","filmy","stack","chose","sleep","ardor","nanny","niece","woozy","handy","grace","ditto","stank","cream","usual","diode","valor","angle","ninja","muddy","chase","reply","prone","spoil","heart","shade","diner","arson","onion","sleet","dowel","couch","palsy","bowel","smile","evoke","creek","lance","eagle","idiot","siren","built","embed","award","dross","annul","goody","frown","patio","laden","humid","elite","lymph","edify","might","reset","visit","gusto","purse","vapor","crock","write","sunny","loath","chaff","slide","queer","venom","stamp","sorry","still","acorn","aping","pushy","tamer","hater","mania","awoke","brawn","swift","exile","birch","lucky","freer","risky","ghost","plier","lunar","winch","snare","nurse","house","borax","nicer","lurch","exalt","about","savvy","toxin","tunic","pried","inlay","chump","lanky","cress","eater","elude","cycle","kitty","boule","moron","tenet","place","lobby","plush","vigil","index","blink","clung","qualm","croup","clink","juicy","stage","decay","nerve","flier","shaft","crook","clean","china","ridge","vowel","gnome","snuck","icing","spiny","rigor","snail","flown","rabid","prose","thank","poppy","budge","fiber","moldy","dowdy","kneel","track","caddy","quell","dumpy","paler","swore","rebar","scuba","splat","flyer","horny","mason","doing","ozone","amply","molar","ovary","beset","queue","cliff","magic","truce","sport","fritz","edict","twirl","verse","llama","eaten","range","whisk","hovel","rehab","macaw","sigma","spout","verve","sushi","dying","fetid","brain","buddy","thump","scion","candy","chord","basin","march","crowd","arbor","gayly","musky","stain","dally","bless","bravo","stung","title","ruler","kiosk","blond","ennui","layer","fluid","tatty","score","cutie","zebra","barge","matey","bluer","aider","shook","river","privy","betel","frisk","bongo","begun","azure","weave","genie","sound","glove","braid","scope","wryly","rover","assay","ocean","bloom","irate","later","woken","silky","wreck","dwelt","slate","smack","solid","amaze","hazel","wrist","jolly","globe","flint","rouse","civil","vista","relax","cover","alive","beech","jetty","bliss","vocal","often","dolly","eight","joker","since","event","ensue","shunt","diver","poser","worst","sweep","alley","creed","anime","leafy","bosom","dunce","stare","pudgy","waive","choir","stood","spoke","outgo","delay","bilge","ideal","clasp","seize","hotly","laugh","sieve","block","meant","grape","noose","hardy","shied","drawl","daisy","putty","strut","burnt","tulip","crick","idyll","vixen","furor","geeky","cough","naive","shoal","stork","bathe","aunty","check","prime","brass","outer","furry","razor","elect","evict","imply","demur","quota","haven","cavil","swear","crump","dough","gavel","wagon","salon","nudge","harem","pitch","sworn","pupil","excel","stony","cabin","unzip","queen","trout","polyp","earth","storm","until","taper","enter","child","adopt","minor","fatty","husky","brave","filet","slime","glint","tread","steal","regal","guest","every","murky","share","spore","hoist","buxom","inner","otter","dimly","level","sumac","donut","stilt","arena","sheet","scrub","fancy","slimy","pearl","silly","porch","dingo","sepia","amble","shady","bread","friar","reign","dairy","quill","cross","brood","tuber","shear","posit","blank","villa","shank","piggy","freak","which","among","fecal","shell","would","algae","large","rabbi","agony","amuse","bushy","copse","swoon","knife","pouch","ascot","plane","crown","urban","snide","relay","abide","viola","rajah","straw","dilly","crash","amass","third","trick","tutor","woody","blurb","grief","disco","where","sassy","beach","sauna","comic","clued","creep","caste","graze","snuff","frock","gonad","drunk","prong","lurid","steel","halve","buyer","vinyl","utile","smell","adage","worry","tasty","local","trade","finch","ashen","modal","gaunt","clove","enact","adorn","roast","speck","sheik","missy","grunt","snoop","party","touch","mafia","emcee","array","south","vapid","jelly","skulk","angst","tubal","lower","crest","sweat","cyber","adore","tardy","swami","notch","groom","roach","hitch","young","align","ready","frond","strap","puree","realm","venue","swarm","offer","seven","dryer","diary","dryly","drank","acrid","heady","theta","junto","pixie","quoth","bonus","shalt","penne","amend","datum","build","piano","shelf","lodge","suing","rearm","coral","ramen","worth","psalm","infer","overt","mayor","ovoid","glide","usage","poise","randy","chuck","prank","fishy","tooth","ether","drove","idler","swath","stint","while","begat","apply","slang","tarot","radar","credo","aware","canon","shift","timer","bylaw","serum","three","steak","iliac","shirk","blunt","puppy","penal","joist","bunny","shape","beget","wheel","adept","stunt","stole","topaz","chore","fluke","afoot","bloat","bully","dense","caper","sneer","boxer","jumbo","lunge","space","avail","short","slurp","loyal","flirt","pizza","conch","tempo","droop","plate","bible","plunk","afoul","savoy","steep","agile","stake","dwell","knave","beard","arose","motif","smash","broil","glare","shove","baggy","mammy","swamp","along","rugby","wager","quack","squat","snaky","debit","mange","skate","ninth","joust","tramp","spurn","medal","micro","rebel","flank","learn","nadir","maple","comfy","remit","gruff","ester","least","mogul","fetch","cause","oaken","aglow","meaty","gaffe","shyly","racer","prowl","thief","stern","poesy","rocky","tweet","waist","spire","grope","havoc","patsy","truly","forty","deity","uncle","swish","giver","preen","bevel","lemur","draft","slope","annoy","lingo","bleak","ditty","curly","cedar","dirge","grown","horde","drool","shuck","crypt","cumin","stock","gravy","locus","wider","breed","quite","chafe","cache","blimp","deign","fiend","logic","cheap","elide","rigid","false","renal","pence","rowdy","shoot","blaze","envoy","posse","brief","never","abort","mouse","mucky","sulky","fiery","media","trunk","yeast","clear","skunk","scalp","bitty","cider","koala","duvet","segue","creme","super","grill","after","owner","ember","reach","nobly","empty","speed","gipsy","recur","smock","dread","merge","burst","kappa","amity","shaky","hover","carol","snort","synod","faint","haunt","flour","chair","detox","shrew","tense","plied","quark","burly","novel","waxen","stoic","jerky","blitz","beefy","lyric","hussy","towel","quilt","below","bingo","wispy","brash","scone","toast","easel","saucy","value","spice","honor","route","sharp","bawdy","radii","skull","phony","issue","lager","swell","urine","gassy","trial","flora","upper","latch","wight","brick","retry","holly","decal","grass","shack","dogma","mover","defer","sober","optic","crier","vying","nomad","flute","hippo","shark","drier","obese","bugle","tawny","chalk","feast","ruddy","pedal","scarf","cruel","bleat","tidal","slush","semen","windy","dusty","sally","igloo","nerdy","jewel","shone","whale","hymen","abuse","fugue","elbow","crumb","pansy","welsh","syrup","terse","suave","gamut","swung","drake","freed","afire","shirt","grout","oddly","tithe","plaid","dummy","broom","blind","torch","enemy","again","tying","pesky","alter","gazer","noble","ethos","bride","extol","decor","hobby","beast","idiom","utter","these","sixth","alarm","erase","elegy","spunk","piper","scaly","scold","hefty","chick","sooty","canal","whiny","slash","quake","joint","swept","prude","heavy","wield","femme","lasso","maize","shale","screw","spree","smoky","whiff","scent","glade","spent","prism","stoke","riper","orbit","cocoa","guilt","humus","shush","table","smirk","wrong","noisy","alert","shiny","elate","resin","whole","hunch","pixel","polar","hotel","sword","cleat","mango","rumba","puffy","filly","billy","leash","clout","dance","ovate","facet","chili","paint","liner","curio","salty","audio","snake","fable","cloak","navel","spurt","pesto","balmy","flash","unwed","early","churn","weedy","stump","lease","witty","wimpy","spoof","saner","blend","salsa","thick","warty","manic","blare","squib","spoon","probe","crepe","knack","force","debut","order","haste","teeth","agent","widen","icily","slice","ingot","clash","juror","blood","abode","throw","unity","pivot","slept","troop","spare","sewer","parse","morph","cacti","tacky","spool","demon","moody","annex","begin","fuzzy","patch","water","lumpy","admin","omega","limit","tabby","macho","aisle","skiff","basis","plank","verge","botch","crawl","lousy","slain","cubic","raise","wrack","guide","foist","cameo","under","actor","revue","fraud","harpy","scoop","climb","refer","olden","clerk","debar","tally","ethic","cairn","tulle","ghoul","hilly","crude","apart","scale","older","plain","sperm","briny","abbot","rerun","quest","crisp","bound","befit","drawn","suite","itchy","cheer","bagel","guess","broad","axiom","chard","caput","leant","harsh","curse","proud","swing","opine","taste","lupus","gumbo","miner","green","chasm","lipid","topic","armor","brush","crane","mural","abled","habit","bossy","maker","dusky","dizzy","lithe","brook","jazzy","fifty","sense","giant","surly","legal","fatal","flunk","began","prune","small","slant","scoff","torus","ninny","covey","viper","taken","moral","vogue","owing","token","entry","booth","voter","chide","elfin","ebony","neigh","minim","melon","kneed","decoy","voila","ankle","arrow","mushy","tribe","cease","eager","birth","graph","odder","terra","weird","tried","clack","color","rough","weigh","uncut","ladle","strip","craft","minus","dicey","titan","lucid","vicar","dress","ditch","gypsy","pasta","taffy","flame","swoop","aloof","sight","broke","teary","chart","sixty","wordy","sheer","leper","nosey","bulge","savor","clamp","funky","foamy","toxic","brand","plumb","dingy","butte","drill","tripe","bicep","tenor","krill","worse","drama","hyena","think","ratio","cobra","basil","scrum","bused","phone","court","camel","proof","heard","angel","petal","pouty","throb","maybe","fetal","sprig","spine","shout","cadet","macro","dodgy","satyr","rarer","binge","trend","nutty","leapt","amiss","split","myrrh","width","sonar","tower","baron","fever","waver","spark","belie","sloop","expel","smote","baler","above","north","wafer","scant","frill","awash","snack","scowl","frail","drift","limbo","fence","motel","ounce","wreak","revel","talon","prior","knelt","cello","flake","debug","anode","crime","salve","scout","imbue","pinky","stave","vague","chock","fight","video","stone","teach","cleft","frost","prawn","booty","twist","apnea","stiff","plaza","ledge","tweak","board","grant","medic","bacon","cable","brawl","slunk","raspy","forum","drone","women","mucus","boast","toddy","coven","tumor","truer","wrath","stall","steam","axial","purer","daily","trail","niche","mealy","juice","nylon","plump","merry","flail","papal","wheat","berry","cower","erect","brute","leggy","snipe","sinew","skier","penny","jumpy","rally","umbra","scary","modem","gross","avian","greed","satin","tonic","parka","sniff","livid","stark","trump","giddy","reuse","taboo","avoid","quote","devil","liken","gloss","gayer","beret","noise","gland","dealt","sling","rumor","opera","thigh","tonga","flare","wound","white","bulky","etude","horse","circa","paddy","inbox","fizzy","grain","exert","surge","gleam","belle","salvo","crush","fruit","sappy","taker","tract","ovine","spiky","frank","reedy","filth","spasm","heave","mambo","right","clank","trust","lumen","borne","spook","sauce","amber","lathe","carat","corer","dirty","slyly","affix","alloy","taint","sheep","kinky","wooly","mauve","flung","yacht","fried","quail","brunt","grimy","curvy","cagey","rinse","deuce","state","grasp","milky","bison","graft","sandy","baste","flask","hedge","girly","swash","boney","coupe","endow","abhor","welch","blade","tight","geese","miser","mirth","cloud","cabal","leech","close","tenth","pecan","droit","grail","clone","guise","ralph","tango","biddy","smith","mower","payee","serif","drape","fifth","spank","glaze","allot","truck","kayak","virus","testy","tepee","fully","zonal","metro","curry","grand","banjo","axion","bezel","occur","chain","nasal","gooey","filer","brace","allay","pubic","raven","plead","gnash","flaky","munch","dully","eking","thing","slink","hurry","theft","shorn","pygmy","ranch","wring","lemon","shore","mamma","froze","newer","style","moose","antic","drown","vegan","chess","guppy","union","lever","lorry","image","cabby","druid","exact","truth","dopey","spear","cried","chime","crony","stunk","timid","batch","gauge","rotor","crack","curve","latte","witch","bunch","repel","anvil","soapy","meter","broth","madly","dried","scene","known","magma","roost","woman","thong","punch","pasty","downy","knead","whirl","rapid","clang","anger","drive","goofy","email","music","stuff","bleep","rider","mecca","folio","setup","verso","quash","fauna","gummy","happy","newly","fussy","relic","guava","ratty","fudge","femur","chirp","forte","alibi","whine","petty","golly","plait","fleck","felon","gourd","brown","thrum","ficus","stash","decry","wiser","junta","visor","daunt","scree","impel","await","press","whose","turbo","stoop","speak","mangy","eying","inlet","crone","pulse","mossy","staid","hence","pinch","teddy","sully","snore","ripen","snowy","attic","going","leach","mouth","hound","clump","tonal","bigot","peril","piece","blame","haute","spied","undid","intro","basal","shine","gecko","rodeo","guard","steer","loamy","scamp","scram","manly","hello","vaunt","organ","feral","knock","extra","condo","adapt","willy","polka","rayon","skirt","faith","torso","match","mercy","tepid","sleek","riser","twixt","peace","flush","catty","login","eject","roger","rival","untie","refit","aorta","adult","judge","rower","artsy","rural","shave"
    ];

    const letters = "abdcefghijklmnopqrstuvwxyz";

    function manager(list = shortWordList){
      const m = {};
      let constraint = [ [...letters],[...letters],[...letters],[...letters],[...letters] ];
      const knownLetters = [];
      const checkedLetters = [];

      function getLetterFrequency(subList, unique=true){
        console.log(`checking letter frequency for ${subList.length} words`);
        return subList.reduce((letters, word)=>{
          let newLetters;
          newLetters = unique ? [...new Set(word.split(''))] : word.split(''); 
          newLetters.forEach(l => {
            if(!letters[l]){ letters[l]=0; }
            letters[l] ++;
          });
          return letters;
        }, {});
      }

      function getWordValues(subList, unique=true){ 
        const frequencies = getLetterFrequency(subList);
        console.log(`assigning values to ${subList.length} words`);
        return subList.map(word=>{
          const letters = unique ? [...new Set(word.split(''))] : word.split(''); //unique letters
          const value = letters
            .reduce((acc, letter)=>{
              acc += frequencies[letter];
              return acc;
            }, 0);
          return { word, value }
        })
        .sort((a,b)=>{
          return b.value-a.value;
        });
      }

      m.excludeLetter = function(letterToRemove){
        constraint = constraint.map(possibleLetters=>{
          return possibleLetters.filter(possibleLetter => possibleLetter != letterToRemove);
        });
      };

      m.excludeLetterAtPosition = function(letterToRemove, position){
        constraint[position] = constraint[position].filter(possibleLetter => possibleLetter != letterToRemove);
      };

      m.exclusiveAtPosition = function(letter, position){
        constraint[position] = [letter];
      };

      m.setWordleResult = function(result){     /* result example = [
        {letter:"a", value:"grey"}, //exclude from all positions
        {letter:"b", value:"green"}, // exclude everythign else at this position
        {letter:"c", value:"yellow"}, etc. ] // exclude from this position */
        checkedLetters.push();
        result.forEach((position,i)=>{
          const p = [];
          p[i] = position.letter;
          checkedLetters.push(position.letter);
          switch(position.value){
            case "green":
              m.exclusiveAtPosition(position.letter, i);
              knownLetters.push(position.letter);
              break;
            case "yellow":
              m.excludeLetterAtPosition(position.letter, i);
              knownLetters.push(position.letter); //TODO: deal with double letters
              break;
            case "grey":
              m.excludeLetter(position.letter);
              break;
          }
        });

        return m;
      };

      m.constraint = function(){
        return constraint;
      };

      m.rankedList = function(){
        // filter the list by contraint
        const filteredList = list.filter(word=>{
          // for each letter in the word does it satisfy the constraint for that positions
          for(let i=0; i<word.length; i++){
            if(constraint[i].indexOf(word[i]) < 0){
              return false;
            }
          }
          return true;
        }).filter(word=>{ // remove anythin that doesn't conatain all knownLetters
          return knownLetters.reduce((acc, letter)=>{
            return word.indexOf(letter)>-1 && acc;
          },true);
        });
        // TODO: rank it by letter frequency
        return getWordValues(filteredList);
      };

      m.disjunct = function(){
        const a = new Set(shortWordList);
        const b = new Set(m.rankedList().map(d=>d.word));
        const difference = [...new Set([...a].filter(x => !b.has(x)))];
        const unchecked = difference.filter(word=>{
          return [...word].reduce((acc, letter)=>{
            return !(checkedLetters.indexOf(letter)>-1) && acc
          },true);
        });
        return getWordValues(unchecked);
      };
      
      return m;
    }

    var constraintManager = manager;

    /* src/Guess.svelte generated by Svelte v3.45.0 */

    const { console: console_1$1 } = globals;
    const file$2 = "src/Guess.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (45:2) {#each letters as letter, i }
    function create_each_block$2(ctx) {
    	let div;
    	let t_value = /*letter*/ ctx[8] + "";
    	let t;
    	let div_class_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[6](/*letter*/ ctx[8], /*i*/ ctx[10]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);

    			attr_dev(div, "class", div_class_value = "letter " + (/*wordleResult*/ ctx[0][/*i*/ ctx[10]]
    			? /*wordleResult*/ ctx[0][/*i*/ ctx[10]].value
    			: 'not') + " svelte-172ghyr");

    			add_location(div, file$2, 45, 2, 1064);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*letters*/ 4 && t_value !== (t_value = /*letter*/ ctx[8] + "")) set_data_dev(t, t_value);

    			if (dirty & /*wordleResult*/ 1 && div_class_value !== (div_class_value = "letter " + (/*wordleResult*/ ctx[0][/*i*/ ctx[10]]
    			? /*wordleResult*/ ctx[0][/*i*/ ctx[10]].value
    			: 'not') + " svelte-172ghyr")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(45:2) {#each letters as letter, i }",
    		ctx
    	});

    	return block;
    }

    // (48:2) {#if valid}
    function create_if_block_1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Refine suggestions";
    			add_location(button, file$2, 48, 2, 1216);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*submit*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(48:2) {#if valid}",
    		ctx
    	});

    	return block;
    }

    // (51:2) {#if letters.length > 0 }
    function create_if_block(ctx) {
    	let p;
    	let t1;
    	let ul;
    	let li0;
    	let t3;
    	let li1;
    	let t5;
    	let li2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Click the letters to cycle through the colours";
    			t1 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Yellow: right letter, wrong place";
    			t3 = space();
    			li1 = element("li");
    			li1.textContent = "Green: right letter, right place";
    			t5 = space();
    			li2 = element("li");
    			li2.textContent = "Grey: wrong letter";
    			attr_dev(p, "class", "instructions svelte-172ghyr");
    			add_location(p, file$2, 51, 4, 1310);
    			attr_dev(li0, "class", "yellow swatch svelte-172ghyr");
    			add_location(li0, file$2, 53, 6, 1412);
    			attr_dev(li1, "class", "green swatch svelte-172ghyr");
    			add_location(li1, file$2, 54, 6, 1483);
    			attr_dev(li2, "class", "grey swatch svelte-172ghyr");
    			add_location(li2, file$2, 55, 6, 1552);
    			attr_dev(ul, "class", "key svelte-172ghyr");
    			add_location(ul, file$2, 52, 4, 1389);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li0);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(ul, t5);
    			append_dev(ul, li2);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(ul);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(51:2) {#if letters.length > 0 }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let each_value = /*letters*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	let if_block0 = /*valid*/ ctx[1] && create_if_block_1(ctx);
    	let if_block1 = /*letters*/ ctx[2].length > 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			p = element("p");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			add_location(p, file$2, 43, 0, 1026);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(p, null);
    			}

    			append_dev(p, t0);
    			if (if_block0) if_block0.m(p, null);
    			append_dev(p, t1);
    			if (if_block1) if_block1.m(p, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*wordleResult, cycleLetterState, letters*/ 13) {
    				each_value = /*letters*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(p, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*valid*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(p, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*letters*/ ctx[2].length > 0) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(p, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let letters;
    	let valid;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Guess', slots, []);
    	let { word = '' } = $$props;
    	const dispatch = createEventDispatcher();
    	let wordleResult = [{}, {}, {}, {}, {}];

    	/* eg
      [{ letter:'a', value:'yellow' },
      { letter:'r', value:'yellow' },
      { letter:'o', value:'yellow' },
      { letter:'s', value:'grey' },
      { letter:'e', value:'grey' }]
    */
    	function cycleLetterState(letter, i) {
    		let states = ["grey", "yellow", "green"];
    		console.log('cycle', letter, i);

    		if (!wordleResult[i].letter) {
    			$$invalidate(0, wordleResult[i] = { letter, value: 'grey' }, wordleResult);
    		}

    		let nextState = (states.findIndex(s => s == wordleResult[i].value) + 1) % states.length;
    		$$invalidate(0, wordleResult[i].value = states[nextState], wordleResult);

    		$$invalidate(1, valid = wordleResult.reduce(
    			(acc, d) => {
    				console.log(d);
    				return d.letter != undefined && acc;
    			},
    			true
    		));
    	}

    	function submit() {
    		dispatch('submit', wordleResult);
    		$$invalidate(0, wordleResult = [{}, {}, {}, {}, {}]);
    		$$invalidate(5, word = '');
    		$$invalidate(1, valid = false);
    	}

    	const writable_props = ['word'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Guess> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (letter, i) => cycleLetterState(letter, i);

    	$$self.$$set = $$props => {
    		if ('word' in $$props) $$invalidate(5, word = $$props.word);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		word,
    		dispatch,
    		wordleResult,
    		cycleLetterState,
    		submit,
    		valid,
    		letters
    	});

    	$$self.$inject_state = $$props => {
    		if ('word' in $$props) $$invalidate(5, word = $$props.word);
    		if ('wordleResult' in $$props) $$invalidate(0, wordleResult = $$props.wordleResult);
    		if ('valid' in $$props) $$invalidate(1, valid = $$props.valid);
    		if ('letters' in $$props) $$invalidate(2, letters = $$props.letters);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*word*/ 32) {
    			// const letterStates = ["green", "yellow", "grey"];
    			$$invalidate(2, letters = [...word]);
    		}
    	};

    	$$invalidate(1, valid = false);
    	return [wordleResult, valid, letters, cycleLetterState, submit, word, click_handler];
    }

    class Guess extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { word: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Guess",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get word() {
    		throw new Error("<Guess>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set word(value) {
    		throw new Error("<Guess>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/GuessRecord.svelte generated by Svelte v3.45.0 */

    const file$1 = "src/GuessRecord.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (5:2) {#each guess as letter}
    function create_each_block$1(ctx) {
    	let span;
    	let t_value = /*letter*/ ctx[1].letter + "";
    	let t;
    	let span_class_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", span_class_value = "" + (null_to_empty(`letter ${/*letter*/ ctx[1].value}`) + " svelte-7gj0op"));
    			add_location(span, file$1, 5, 4, 98);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*guess*/ 1 && t_value !== (t_value = /*letter*/ ctx[1].letter + "")) set_data_dev(t, t_value);

    			if (dirty & /*guess*/ 1 && span_class_value !== (span_class_value = "" + (null_to_empty(`letter ${/*letter*/ ctx[1].value}`) + " svelte-7gj0op"))) {
    				attr_dev(span, "class", span_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(5:2) {#each guess as letter}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let each_value = /*guess*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(div, file$1, 3, 0, 62);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*guess*/ 1) {
    				each_value = /*guess*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('GuessRecord', slots, []);
    	let { guess = [{}, {}, {}, {}, {}] } = $$props;
    	const writable_props = ['guess'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<GuessRecord> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('guess' in $$props) $$invalidate(0, guess = $$props.guess);
    	};

    	$$self.$capture_state = () => ({ guess });

    	$$self.$inject_state = $$props => {
    		if ('guess' in $$props) $$invalidate(0, guess = $$props.guess);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [guess];
    }

    class GuessRecord extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { guess: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GuessRecord",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get guess() {
    		throw new Error("<GuessRecord>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set guess(value) {
    		throw new Error("<GuessRecord>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.45.0 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (47:3) {#each guessHistory as guess}
    function create_each_block_2(ctx) {
    	let guessrecord;
    	let current;

    	guessrecord = new GuessRecord({
    			props: { guess: /*guess*/ ctx[16] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(guessrecord.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(guessrecord, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const guessrecord_changes = {};
    			if (dirty & /*guessHistory*/ 8) guessrecord_changes.guess = /*guess*/ ctx[16];
    			guessrecord.$set(guessrecord_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(guessrecord.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(guessrecord.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(guessrecord, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(47:3) {#each guessHistory as guess}",
    		ctx
    	});

    	return block;
    }

    // (55:3) {#each possibilities as possibility}
    function create_each_block_1(ctx) {
    	let a;
    	let t0_value = /*possibility*/ ctx[11].word + "";
    	let t0;
    	let sub;
    	let t1_value = /*possibility*/ ctx[11].value + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[8](/*possibility*/ ctx[11]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text(t0_value);
    			sub = element("sub");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(sub, "class", "svelte-17kj0mv");
    			add_location(sub, file, 55, 97, 1361);
    			attr_dev(a, "href", "#top");
    			attr_dev(a, "class", "suggestion svelte-17kj0mv");
    			add_location(a, file, 55, 3, 1267);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, sub);
    			append_dev(sub, t1);
    			append_dev(a, t2);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*possibilities*/ 1 && t0_value !== (t0_value = /*possibility*/ ctx[11].word + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*possibilities*/ 1 && t1_value !== (t1_value = /*possibility*/ ctx[11].value + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(55:3) {#each possibilities as possibility}",
    		ctx
    	});

    	return block;
    }

    // (61:3) {#each untried as possibility}
    function create_each_block(ctx) {
    	let a;
    	let t0_value = /*possibility*/ ctx[11].word + "";
    	let t0;
    	let sub;
    	let t1_value = /*possibility*/ ctx[11].value + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[9](/*possibility*/ ctx[11]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text(t0_value);
    			sub = element("sub");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(sub, "class", "svelte-17kj0mv");
    			add_location(sub, file, 61, 97, 1651);
    			attr_dev(a, "href", "#top");
    			attr_dev(a, "class", "suggestion svelte-17kj0mv");
    			add_location(a, file, 61, 3, 1557);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, sub);
    			append_dev(sub, t1);
    			append_dev(a, t2);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*untried*/ 2 && t0_value !== (t0_value = /*possibility*/ ctx[11].word + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*untried*/ 2 && t1_value !== (t1_value = /*possibility*/ ctx[11].value + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(61:3) {#each untried as possibility}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let article;
    	let h1;
    	let t0;
    	let span;
    	let t2;
    	let t3;
    	let section0;
    	let div1;
    	let p0;
    	let t4;
    	let input;
    	let t5;
    	let div0;
    	let guess;
    	let t6;
    	let div2;
    	let t7;
    	let section1;
    	let div3;
    	let h20;
    	let t8;
    	let t9_value = /*possibilities*/ ctx[0].length + "";
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let div4;
    	let h21;
    	let t13;
    	let t14_value = /*untried*/ ctx[1].length + "";
    	let t14;
    	let t15;
    	let a0;
    	let sup;
    	let t17;
    	let t18;
    	let section2;
    	let h3;
    	let t20;
    	let p1;
    	let t21;
    	let a1;
    	let t23;
    	let footer;
    	let p2;
    	let a2;
    	let t25;
    	let current;
    	let mounted;
    	let dispose;

    	guess = new Guess({
    			props: { word: /*currentGuess*/ ctx[2] },
    			$$inline: true
    		});

    	guess.$on("submit", /*submitGuess*/ ctx[4]);
    	let each_value_2 = /*guessHistory*/ ctx[3];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks_2[i], 1, 1, () => {
    		each_blocks_2[i] = null;
    	});

    	let each_value_1 = /*possibilities*/ ctx[0];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*untried*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			article = element("article");
    			h1 = element("h1");
    			t0 = text("Wordle ");
    			span = element("span");
    			span.textContent = "helper";
    			t2 = text(" ruiner v1");
    			t3 = space();
    			section0 = element("section");
    			div1 = element("div");
    			p0 = element("p");
    			t4 = text("Guess: \n\t\t\t\t");
    			input = element("input");
    			t5 = space();
    			div0 = element("div");
    			create_component(guess.$$.fragment);
    			t6 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t7 = space();
    			section1 = element("section");
    			div3 = element("div");
    			h20 = element("h2");
    			t8 = text("Suggestions (");
    			t9 = text(t9_value);
    			t10 = text(")");
    			t11 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t12 = space();
    			div4 = element("div");
    			h21 = element("h2");
    			t13 = text("Ruled out but not useless (");
    			t14 = text(t14_value);
    			t15 = text(") ");
    			a0 = element("a");
    			sup = element("sup");
    			sup.textContent = "?";
    			t17 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t18 = space();
    			section2 = element("section");
    			h3 = element("h3");
    			h3.textContent = "Not useless?";
    			t20 = space();
    			p1 = element("p");
    			t21 = text("Sometimes it's useful to play a word that's technically been ruled out in order to find out some more letters, that's what the words in this second column are for. ");
    			a1 = element("a");
    			a1.textContent = "Back to the top ↑";
    			t23 = space();
    			footer = element("footer");
    			p2 = element("p");
    			a2 = element("a");
    			a2.textContent = "Tom Pearson";
    			t25 = text(" Jan 2022");
    			attr_dev(span, "class", "strike svelte-17kj0mv");
    			add_location(span, file, 34, 21, 753);
    			attr_dev(h1, "id", "top");
    			add_location(h1, file, 34, 1, 733);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "maxlength", 5);
    			add_location(input, file, 39, 4, 859);
    			add_location(p0, file, 37, 3, 839);
    			add_location(div0, file, 41, 3, 932);
    			add_location(div1, file, 36, 2, 830);
    			attr_dev(div2, "class", "history");
    			add_location(div2, file, 45, 2, 1016);
    			attr_dev(section0, "class", "input svelte-17kj0mv");
    			add_location(section0, file, 35, 1, 804);
    			attr_dev(h20, "class", "svelte-17kj0mv");
    			add_location(h20, file, 53, 3, 1178);
    			add_location(div3, file, 52, 2, 1169);
    			add_location(sup, file, 59, 73, 1498);
    			attr_dev(a0, "href", "#ruled-out");
    			add_location(a0, file, 59, 52, 1477);
    			attr_dev(h21, "class", "svelte-17kj0mv");
    			add_location(h21, file, 59, 3, 1428);
    			add_location(div4, file, 58, 2, 1419);
    			attr_dev(section1, "class", "suggestions svelte-17kj0mv");
    			add_location(section1, file, 51, 1, 1137);
    			add_location(h3, file, 66, 2, 1747);
    			attr_dev(a1, "class", "up");
    			attr_dev(a1, "href", "#top");
    			add_location(a1, file, 67, 169, 1938);
    			add_location(p1, file, 67, 2, 1771);
    			attr_dev(section2, "id", "ruled-out");
    			attr_dev(section2, "class", "svelte-17kj0mv");
    			add_location(section2, file, 65, 1, 1720);
    			add_location(article, file, 33, 1, 722);
    			attr_dev(a2, "href", "https://www.toffeemilkshake.co.uk");
    			add_location(a2, file, 71, 7, 2036);
    			add_location(p2, file, 71, 4, 2033);
    			add_location(footer, file, 70, 1, 2020);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, h1);
    			append_dev(h1, t0);
    			append_dev(h1, span);
    			append_dev(h1, t2);
    			append_dev(article, t3);
    			append_dev(article, section0);
    			append_dev(section0, div1);
    			append_dev(div1, p0);
    			append_dev(p0, t4);
    			append_dev(p0, input);
    			set_input_value(input, /*currentGuess*/ ctx[2]);
    			append_dev(div1, t5);
    			append_dev(div1, div0);
    			mount_component(guess, div0, null);
    			append_dev(section0, t6);
    			append_dev(section0, div2);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div2, null);
    			}

    			append_dev(article, t7);
    			append_dev(article, section1);
    			append_dev(section1, div3);
    			append_dev(div3, h20);
    			append_dev(h20, t8);
    			append_dev(h20, t9);
    			append_dev(h20, t10);
    			append_dev(div3, t11);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div3, null);
    			}

    			append_dev(section1, t12);
    			append_dev(section1, div4);
    			append_dev(div4, h21);
    			append_dev(h21, t13);
    			append_dev(h21, t14);
    			append_dev(h21, t15);
    			append_dev(h21, a0);
    			append_dev(a0, sup);
    			append_dev(div4, t17);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			append_dev(article, t18);
    			append_dev(article, section2);
    			append_dev(section2, h3);
    			append_dev(section2, t20);
    			append_dev(section2, p1);
    			append_dev(p1, t21);
    			append_dev(p1, a1);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, p2);
    			append_dev(p2, a2);
    			append_dev(p2, t25);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[7]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentGuess*/ 4 && input.value !== /*currentGuess*/ ctx[2]) {
    				set_input_value(input, /*currentGuess*/ ctx[2]);
    			}

    			const guess_changes = {};
    			if (dirty & /*currentGuess*/ 4) guess_changes.word = /*currentGuess*/ ctx[2];
    			guess.$set(guess_changes);

    			if (dirty & /*guessHistory*/ 8) {
    				each_value_2 = /*guessHistory*/ ctx[3];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    						transition_in(each_blocks_2[i], 1);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						transition_in(each_blocks_2[i], 1);
    						each_blocks_2[i].m(div2, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_2.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if ((!current || dirty & /*possibilities*/ 1) && t9_value !== (t9_value = /*possibilities*/ ctx[0].length + "")) set_data_dev(t9, t9_value);

    			if (dirty & /*tryWord, possibilities*/ 33) {
    				each_value_1 = /*possibilities*/ ctx[0];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if ((!current || dirty & /*untried*/ 2) && t14_value !== (t14_value = /*untried*/ ctx[1].length + "")) set_data_dev(t14, t14_value);

    			if (dirty & /*tryWord, untried*/ 34) {
    				each_value = /*untried*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(guess.$$.fragment, local);

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_2[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(guess.$$.fragment, local);
    			each_blocks_2 = each_blocks_2.filter(Boolean);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				transition_out(each_blocks_2[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(article);
    			destroy_component(guess);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let m = constraintManager();
    	let possibilities, untried;
    	let guessCount = 0;
    	let currentGuess = '';
    	let guessHistory = [];

    	function submitGuess(e) {
    		console.log('submit', e.detail);
    		guessHistory.push(e.detail);
    		$$invalidate(3, guessHistory);
    		m.setWordleResult(e.detail);
    		$$invalidate(6, guessCount++, guessCount);
    		$$invalidate(2, currentGuess = '');
    	}

    	function tryWord(w) {
    		$$invalidate(2, currentGuess = w);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		currentGuess = this.value;
    		$$invalidate(2, currentGuess);
    	}

    	const click_handler = possibility => tryWord(possibility.word);
    	const click_handler_1 = possibility => tryWord(possibility.word);

    	$$self.$capture_state = () => ({
    		manager: constraintManager,
    		Guess,
    		GuessRecord,
    		m,
    		possibilities,
    		untried,
    		guessCount,
    		currentGuess,
    		guessHistory,
    		submitGuess,
    		tryWord
    	});

    	$$self.$inject_state = $$props => {
    		if ('m' in $$props) $$invalidate(10, m = $$props.m);
    		if ('possibilities' in $$props) $$invalidate(0, possibilities = $$props.possibilities);
    		if ('untried' in $$props) $$invalidate(1, untried = $$props.untried);
    		if ('guessCount' in $$props) $$invalidate(6, guessCount = $$props.guessCount);
    		if ('currentGuess' in $$props) $$invalidate(2, currentGuess = $$props.currentGuess);
    		if ('guessHistory' in $$props) $$invalidate(3, guessHistory = $$props.guessHistory);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*guessCount*/ 64) {
    			{
    				($$invalidate(6, guessCount), $$invalidate(10, m)); // use this to trigger the reactive block (is there a better way?)
    				$$invalidate(0, possibilities = m.rankedList());
    				$$invalidate(1, untried = m.disjunct());
    			}
    		}
    	};

    	return [
    		possibilities,
    		untried,
    		currentGuess,
    		guessHistory,
    		submitGuess,
    		tryWord,
    		guessCount,
    		input_input_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
