
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
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
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
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
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
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
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
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
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
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
            flush_render_callbacks($$.after_update);
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
            ctx: [],
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
            if (!is_function(callback)) {
                return noop;
            }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
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

    /* src\App.svelte generated by Svelte v3.59.2 */

    const { Object: Object_1, document: document_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[94] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[97] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[100] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[103] = list[i];
    	child_ctx[105] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[106] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[106] = list[i];
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[111] = list[i];
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[114] = list[i];
    	return child_ctx;
    }

    function get_each_context_8(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[117] = list[i];
    	return child_ctx;
    }

    function get_each_context_9(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[111] = list[i];
    	return child_ctx;
    }

    function get_each_context_10(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[106] = list[i];
    	return child_ctx;
    }

    function get_each_context_11(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[117] = list[i];
    	return child_ctx;
    }

    function get_each_context_12(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[100] = list[i];
    	return child_ctx;
    }

    function get_each_context_13(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[94] = list[i];
    	return child_ctx;
    }

    // (741:1) {#if notification}
    function create_if_block_28(ctx) {
    	let div1;
    	let div0;
    	let span;
    	let t0_value = /*notification*/ ctx[15].message + "";
    	let t0;
    	let t1;
    	let button;
    	let i;
    	let div0_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			button = element("button");
    			i = element("i");
    			attr_dev(span, "class", "notification-message svelte-ph2e9d");
    			add_location(span, file, 743, 4, 16284);
    			attr_dev(i, "class", "fas fa-times svelte-ph2e9d");
    			add_location(i, file, 748, 5, 16448);
    			attr_dev(button, "class", "notification-close svelte-ph2e9d");
    			add_location(button, file, 744, 4, 16353);
    			attr_dev(div0, "class", div0_class_value = "notification " + /*notification*/ ctx[15].type + " svelte-ph2e9d");
    			add_location(div0, file, 742, 3, 16233);
    			attr_dev(div1, "class", "notification-container svelte-ph2e9d");
    			add_location(div1, file, 741, 2, 16193);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    			append_dev(span, t0);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(button, i);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[45], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*notification*/ 32768 && t0_value !== (t0_value = /*notification*/ ctx[15].message + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*notification*/ 32768 && div0_class_value !== (div0_class_value = "notification " + /*notification*/ ctx[15].type + " svelte-ph2e9d")) {
    				attr_dev(div0, "class", div0_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_28.name,
    		type: "if",
    		source: "(741:1) {#if notification}",
    		ctx
    	});

    	return block;
    }

    // (816:2) {#if activeTab === "inventory"}
    function create_if_block_26(ctx) {
    	let section;
    	let div4;
    	let h2;
    	let t1;
    	let div3;
    	let div0;
    	let select0;
    	let option0;
    	let t3;
    	let div1;
    	let select1;
    	let option1;
    	let t5;
    	let div2;
    	let select2;
    	let option2;
    	let option3;
    	let option4;
    	let t9;
    	let button0;
    	let i0;
    	let i0_class_value;
    	let t10;
    	let button1;
    	let i1;
    	let t11;
    	let t12;
    	let mounted;
    	let dispose;
    	let each_value_13 = /*locations*/ ctx[24];
    	validate_each_argument(each_value_13);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_13.length; i += 1) {
    		each_blocks_1[i] = create_each_block_13(get_each_context_13(ctx, each_value_13, i));
    	}

    	let each_value_12 = /*categories*/ ctx[23];
    	validate_each_argument(each_value_12);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_12.length; i += 1) {
    		each_blocks[i] = create_each_block_12(get_each_context_12(ctx, each_value_12, i));
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*filteredItems*/ ctx[13].length === 0) return create_if_block_27;
    		return create_else_block_4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			div4 = element("div");
    			h2 = element("h2");
    			h2.textContent = "My Inventory";
    			t1 = space();
    			div3 = element("div");
    			div0 = element("div");
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "All Locations";

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t3 = space();
    			div1 = element("div");
    			select1 = element("select");
    			option1 = element("option");
    			option1.textContent = "All Categories";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			div2 = element("div");
    			select2 = element("select");
    			option2 = element("option");
    			option2.textContent = "Sort by Expiry";
    			option3 = element("option");
    			option3.textContent = "Sort by Name";
    			option4 = element("option");
    			option4.textContent = "Sort by Remaining";
    			t9 = space();
    			button0 = element("button");
    			i0 = element("i");
    			t10 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t11 = text(" Add Item");
    			t12 = space();
    			if_block.c();
    			attr_dev(h2, "class", "svelte-ph2e9d");
    			add_location(h2, file, 818, 5, 18217);
    			option0.__value = "All Locations";
    			option0.value = option0.__value;
    			attr_dev(option0, "class", "svelte-ph2e9d");
    			add_location(option0, file, 825, 8, 18409);
    			attr_dev(select0, "class", "svelte-ph2e9d");
    			if (/*selectedLocation*/ ctx[3] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[52].call(select0));
    			add_location(select0, file, 821, 7, 18310);
    			attr_dev(div0, "class", "select-container svelte-ph2e9d");
    			add_location(div0, file, 820, 6, 18272);
    			option1.__value = "All Categories";
    			option1.value = option1.__value;
    			attr_dev(option1, "class", "svelte-ph2e9d");
    			add_location(option1, file, 837, 8, 18705);
    			attr_dev(select1, "class", "svelte-ph2e9d");
    			if (/*selectedCategory*/ ctx[4] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[53].call(select1));
    			add_location(select1, file, 833, 7, 18606);
    			attr_dev(div1, "class", "select-container svelte-ph2e9d");
    			add_location(div1, file, 832, 6, 18568);
    			option2.__value = "expiryDate";
    			option2.value = option2.__value;
    			attr_dev(option2, "class", "svelte-ph2e9d");
    			add_location(option2, file, 849, 8, 18993);
    			option3.__value = "name";
    			option3.value = option3.__value;
    			attr_dev(option3, "class", "svelte-ph2e9d");
    			add_location(option3, file, 852, 8, 19071);
    			option4.__value = "percentRemaining";
    			option4.value = option4.__value;
    			attr_dev(option4, "class", "svelte-ph2e9d");
    			add_location(option4, file, 853, 8, 19122);
    			attr_dev(select2, "class", "svelte-ph2e9d");
    			if (/*sortBy*/ ctx[5] === void 0) add_render_callback(() => /*select2_change_handler*/ ctx[54].call(select2));
    			add_location(select2, file, 845, 7, 18904);
    			attr_dev(div2, "class", "select-container svelte-ph2e9d");
    			add_location(div2, file, 844, 6, 18866);

    			attr_dev(i0, "class", i0_class_value = "fas fa-" + (/*sortOrder*/ ctx[6] === 'asc'
    			? 'sort-amount-down-alt'
    			: 'sort-amount-up-alt'));

    			add_location(i0, file, 867, 7, 19417);
    			attr_dev(button0, "class", "icon-button svelte-ph2e9d");
    			add_location(button0, file, 859, 6, 19238);
    			attr_dev(i1, "class", "fas fa-plus");
    			add_location(i1, file, 878, 7, 19653);
    			attr_dev(button1, "class", "add-button svelte-ph2e9d");
    			add_location(button1, file, 874, 6, 19567);
    			attr_dev(div3, "class", "filters svelte-ph2e9d");
    			add_location(div3, file, 819, 5, 18244);
    			attr_dev(div4, "class", "section-header svelte-ph2e9d");
    			add_location(div4, file, 817, 4, 18183);
    			attr_dev(section, "class", "fade-in svelte-ph2e9d");
    			add_location(section, file, 816, 3, 18153);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div4);
    			append_dev(div4, h2);
    			append_dev(div4, t1);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, select0);
    			append_dev(select0, option0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(select0, null);
    				}
    			}

    			select_option(select0, /*selectedLocation*/ ctx[3], true);
    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			append_dev(div1, select1);
    			append_dev(select1, option1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*selectedCategory*/ ctx[4], true);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, select2);
    			append_dev(select2, option2);
    			append_dev(select2, option3);
    			append_dev(select2, option4);
    			select_option(select2, /*sortBy*/ ctx[5], true);
    			append_dev(div3, t9);
    			append_dev(div3, button0);
    			append_dev(button0, i0);
    			append_dev(div3, t10);
    			append_dev(div3, button1);
    			append_dev(button1, i1);
    			append_dev(button1, t11);
    			append_dev(section, t12);
    			if_block.m(section, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[52]),
    					listen_dev(select0, "change", /*filterInventory*/ ctx[28], false, false, false, false),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[53]),
    					listen_dev(select1, "change", /*filterInventory*/ ctx[28], false, false, false, false),
    					listen_dev(select2, "change", /*select2_change_handler*/ ctx[54]),
    					listen_dev(select2, "change", /*filterInventory*/ ctx[28], false, false, false, false),
    					listen_dev(button0, "click", /*click_handler_5*/ ctx[55], false, false, false, false),
    					listen_dev(button1, "click", /*toggleAddItemModal*/ ctx[29], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*locations*/ 16777216) {
    				each_value_13 = /*locations*/ ctx[24];
    				validate_each_argument(each_value_13);
    				let i;

    				for (i = 0; i < each_value_13.length; i += 1) {
    					const child_ctx = get_each_context_13(ctx, each_value_13, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_13(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_13.length;
    			}

    			if (dirty[0] & /*selectedLocation, locations*/ 16777224) {
    				select_option(select0, /*selectedLocation*/ ctx[3]);
    			}

    			if (dirty[0] & /*categories*/ 8388608) {
    				each_value_12 = /*categories*/ ctx[23];
    				validate_each_argument(each_value_12);
    				let i;

    				for (i = 0; i < each_value_12.length; i += 1) {
    					const child_ctx = get_each_context_12(ctx, each_value_12, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_12(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_12.length;
    			}

    			if (dirty[0] & /*selectedCategory, categories*/ 8388624) {
    				select_option(select1, /*selectedCategory*/ ctx[4]);
    			}

    			if (dirty[0] & /*sortBy*/ 32) {
    				select_option(select2, /*sortBy*/ ctx[5]);
    			}

    			if (dirty[0] & /*sortOrder*/ 64 && i0_class_value !== (i0_class_value = "fas fa-" + (/*sortOrder*/ ctx[6] === 'asc'
    			? 'sort-amount-down-alt'
    			: 'sort-amount-up-alt'))) {
    				attr_dev(i0, "class", i0_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(section, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_26.name,
    		type: "if",
    		source: "(816:2) {#if activeTab === \\\"inventory\\\"}",
    		ctx
    	});

    	return block;
    }

    // (827:8) {#each locations as location}
    function create_each_block_13(ctx) {
    	let option;
    	let t_value = /*location*/ ctx[94] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*location*/ ctx[94];
    			option.value = option.__value;
    			attr_dev(option, "class", "svelte-ph2e9d");
    			add_location(option, file, 827, 9, 18487);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_13.name,
    		type: "each",
    		source: "(827:8) {#each locations as location}",
    		ctx
    	});

    	return block;
    }

    // (839:8) {#each categories as category}
    function create_each_block_12(ctx) {
    	let option;
    	let t_value = /*category*/ ctx[100] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*category*/ ctx[100];
    			option.value = option.__value;
    			attr_dev(option, "class", "svelte-ph2e9d");
    			add_location(option, file, 839, 9, 18785);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_12.name,
    		type: "each",
    		source: "(839:8) {#each categories as category}",
    		ctx
    	});

    	return block;
    }

    // (895:4) {:else}
    function create_else_block_4(ctx) {
    	let div;
    	let each_value_11 = /*filteredItems*/ ctx[13];
    	validate_each_argument(each_value_11);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_11.length; i += 1) {
    		each_blocks[i] = create_each_block_11(get_each_context_11(ctx, each_value_11, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "inventory-grid svelte-ph2e9d");
    			add_location(div, file, 895, 5, 20050);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*toggleDetailModal, filteredItems, adjustAmount*/ 1073766400 | dirty[1] & /*adjustItemQuantity*/ 16) {
    				each_value_11 = /*filteredItems*/ ctx[13];
    				validate_each_argument(each_value_11);
    				let i;

    				for (i = 0; i < each_value_11.length; i += 1) {
    					const child_ctx = get_each_context_11(ctx, each_value_11, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_11(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_11.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_4.name,
    		type: "else",
    		source: "(895:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (884:4) {#if filteredItems.length === 0}
    function create_if_block_27(ctx) {
    	let div;
    	let i0;
    	let t0;
    	let p;
    	let t2;
    	let button;
    	let i1;
    	let t3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i0 = element("i");
    			t0 = space();
    			p = element("p");
    			p.textContent = "No items found.";
    			t2 = space();
    			button = element("button");
    			i1 = element("i");
    			t3 = text(" Add Item");
    			attr_dev(i0, "class", "fas fa-box-open empty-icon svelte-ph2e9d");
    			add_location(i0, file, 885, 6, 19804);
    			attr_dev(p, "class", "svelte-ph2e9d");
    			add_location(p, file, 886, 6, 19853);
    			attr_dev(i1, "class", "fas fa-plus");
    			add_location(i1, file, 891, 7, 19968);
    			attr_dev(button, "class", "add-button svelte-ph2e9d");
    			add_location(button, file, 887, 6, 19882);
    			attr_dev(div, "class", "empty-state svelte-ph2e9d");
    			add_location(div, file, 884, 5, 19772);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i0);
    			append_dev(div, t0);
    			append_dev(div, p);
    			append_dev(div, t2);
    			append_dev(div, button);
    			append_dev(button, i1);
    			append_dev(button, t3);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*toggleAddItemModal*/ ctx[29], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_27.name,
    		type: "if",
    		source: "(884:4) {#if filteredItems.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (897:6) {#each filteredItems as item}
    function create_each_block_11(ctx) {
    	let div11;
    	let div6;
    	let div0;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let div5;
    	let div1;
    	let h3;
    	let t1_value = /*item*/ ctx[117].name + "";
    	let t1;
    	let t2;
    	let span0;
    	let t3_value = /*item*/ ctx[117].location + "";
    	let t3;
    	let t4;
    	let p;
    	let t5_value = /*item*/ ctx[117].quantity + "";
    	let t5;
    	let t6;
    	let div3;
    	let div2;
    	let div2_class_value;
    	let t7;
    	let div4;
    	let span1;
    	let t8_value = /*item*/ ctx[117].percentRemaining + "";
    	let t8;
    	let t9;
    	let t10;
    	let span2;

    	let t11_value = (calculateDaysUntilExpiry(/*item*/ ctx[117].expiry) > 0
    	? `Expires in ${calculateDaysUntilExpiry(/*item*/ ctx[117].expiry)} days`
    	: "Expired!") + "";

    	let t11;
    	let span2_class_value;
    	let t12;
    	let div10;
    	let span3;
    	let t13_value = formatCurrency(/*item*/ ctx[117].price) + "";
    	let t13;
    	let t14;
    	let div9;
    	let button0;
    	let i0;
    	let t15;
    	let t16;
    	let div8;
    	let input;
    	let t17;
    	let div7;
    	let button1;
    	let i1;
    	let t18;
    	let t19;
    	let button2;
    	let i2;
    	let t20;
    	let t21;
    	let mounted;
    	let dispose;

    	function click_handler_8(...args) {
    		return /*click_handler_8*/ ctx[57](/*item*/ ctx[117], ...args);
    	}

    	function click_handler_9(...args) {
    		return /*click_handler_9*/ ctx[58](/*item*/ ctx[117], ...args);
    	}

    	function click_handler_10() {
    		return /*click_handler_10*/ ctx[59](/*item*/ ctx[117]);
    	}

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div5 = element("div");
    			div1 = element("div");
    			h3 = element("h3");
    			t1 = text(t1_value);
    			t2 = space();
    			span0 = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			p = element("p");
    			t5 = text(t5_value);
    			t6 = space();
    			div3 = element("div");
    			div2 = element("div");
    			t7 = space();
    			div4 = element("div");
    			span1 = element("span");
    			t8 = text(t8_value);
    			t9 = text("%\n\t\t\t\t\t\t\t\t\t\t\t\tRemaining");
    			t10 = space();
    			span2 = element("span");
    			t11 = text(t11_value);
    			t12 = space();
    			div10 = element("div");
    			span3 = element("span");
    			t13 = text(t13_value);
    			t14 = space();
    			div9 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t15 = text(" Edit");
    			t16 = space();
    			div8 = element("div");
    			input = element("input");
    			t17 = space();
    			div7 = element("div");
    			button1 = element("button");
    			i1 = element("i");
    			t18 = text(" Add");
    			t19 = space();
    			button2 = element("button");
    			i2 = element("i");
    			t20 = text(" Use");
    			t21 = space();
    			if (!src_url_equal(img.src, img_src_value = /*item*/ ctx[117].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*item*/ ctx[117].name);
    			attr_dev(img, "class", "svelte-ph2e9d");
    			add_location(img, file, 903, 10, 20295);
    			attr_dev(div0, "class", "item-image svelte-ph2e9d");
    			add_location(div0, file, 902, 9, 20260);
    			attr_dev(h3, "class", "svelte-ph2e9d");
    			add_location(h3, file, 907, 11, 20435);
    			attr_dev(span0, "class", "location-tag svelte-ph2e9d");
    			add_location(span0, file, 908, 11, 20467);
    			attr_dev(div1, "class", "item-header svelte-ph2e9d");
    			add_location(div1, file, 906, 10, 20398);
    			attr_dev(p, "class", "item-quantity svelte-ph2e9d");
    			add_location(p, file, 912, 10, 20569);

    			attr_dev(div2, "class", div2_class_value = "progress-bar " + (/*item*/ ctx[117].percentRemaining <= 20
    			? 'low'
    			: /*item*/ ctx[117].percentRemaining <= 50
    				? 'medium'
    				: 'high') + " svelte-ph2e9d");

    			set_style(div2, "width", /*item*/ ctx[117].percentRemaining + "%");
    			add_location(div2, file, 916, 11, 20691);
    			attr_dev(div3, "class", "progress-container svelte-ph2e9d");
    			add_location(div3, file, 915, 10, 20647);
    			add_location(span1, file, 928, 11, 21032);
    			attr_dev(span2, "class", span2_class_value = "expiry-date " + getExpiryStatusClass(/*item*/ ctx[117].expiry) + " svelte-ph2e9d");
    			add_location(span2, file, 932, 11, 21128);
    			attr_dev(div4, "class", "item-meta svelte-ph2e9d");
    			add_location(div4, file, 927, 10, 20997);
    			attr_dev(div5, "class", "item-details svelte-ph2e9d");
    			add_location(div5, file, 905, 9, 20361);
    			attr_dev(div6, "class", "item-content svelte-ph2e9d");
    			add_location(div6, file, 901, 8, 20224);
    			attr_dev(span3, "class", "price-tag svelte-ph2e9d");
    			add_location(span3, file, 947, 9, 21538);
    			attr_dev(i0, "class", "fas fa-pencil-alt");
    			add_location(i0, file, 958, 11, 21830);
    			attr_dev(button0, "class", "action-button svelte-ph2e9d");
    			add_location(button0, file, 951, 10, 21644);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "class", "quantity-input svelte-ph2e9d");
    			attr_dev(input, "placeholder", "Amount");
    			attr_dev(input, "min", "1");
    			attr_dev(input, "max", "100");
    			add_location(input, file, 961, 11, 21942);
    			attr_dev(i1, "class", "fas fa-plus-circle");
    			add_location(i1, file, 983, 13, 22534);
    			attr_dev(button1, "class", "action-button add svelte-ph2e9d");
    			add_location(button1, file, 972, 12, 22254);
    			attr_dev(i2, "class", "fas fa-minus-circle");
    			add_location(i2, file, 998, 13, 22921);
    			attr_dev(button2, "class", "action-button remove svelte-ph2e9d");
    			add_location(button2, file, 987, 12, 22635);
    			attr_dev(div7, "class", "quantity-buttons svelte-ph2e9d");
    			add_location(div7, file, 971, 11, 22211);
    			attr_dev(div8, "class", "quantity-adjuster svelte-ph2e9d");
    			add_location(div8, file, 960, 10, 21899);
    			add_location(div9, file, 950, 9, 21628);
    			attr_dev(div10, "class", "item-actions svelte-ph2e9d");
    			add_location(div10, file, 946, 8, 21502);
    			attr_dev(div11, "class", "inventory-item svelte-ph2e9d");
    			add_location(div11, file, 897, 7, 20122);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div6);
    			append_dev(div6, div0);
    			append_dev(div0, img);
    			append_dev(div6, t0);
    			append_dev(div6, div5);
    			append_dev(div5, div1);
    			append_dev(div1, h3);
    			append_dev(h3, t1);
    			append_dev(div1, t2);
    			append_dev(div1, span0);
    			append_dev(span0, t3);
    			append_dev(div5, t4);
    			append_dev(div5, p);
    			append_dev(p, t5);
    			append_dev(div5, t6);
    			append_dev(div5, div3);
    			append_dev(div3, div2);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, span1);
    			append_dev(span1, t8);
    			append_dev(span1, t9);
    			append_dev(div4, t10);
    			append_dev(div4, span2);
    			append_dev(span2, t11);
    			append_dev(div11, t12);
    			append_dev(div11, div10);
    			append_dev(div10, span3);
    			append_dev(span3, t13);
    			append_dev(div10, t14);
    			append_dev(div10, div9);
    			append_dev(div9, button0);
    			append_dev(button0, i0);
    			append_dev(button0, t15);
    			append_dev(div9, t16);
    			append_dev(div9, div8);
    			append_dev(div8, input);
    			set_input_value(input, /*adjustAmount*/ ctx[14]);
    			append_dev(div8, t17);
    			append_dev(div8, div7);
    			append_dev(div7, button1);
    			append_dev(button1, i1);
    			append_dev(button1, t18);
    			append_dev(div7, t19);
    			append_dev(div7, button2);
    			append_dev(button2, i2);
    			append_dev(button2, t20);
    			append_dev(div11, t21);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler_6, false, false, false, false),
    					listen_dev(input, "input", /*input_input_handler_1*/ ctx[56]),
    					listen_dev(input, "click", click_handler_7, false, false, false, false),
    					listen_dev(button1, "click", click_handler_8, false, false, false, false),
    					listen_dev(button2, "click", click_handler_9, false, false, false, false),
    					listen_dev(div11, "click", click_handler_10, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*filteredItems*/ 8192 && !src_url_equal(img.src, img_src_value = /*item*/ ctx[117].image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*filteredItems*/ 8192 && img_alt_value !== (img_alt_value = /*item*/ ctx[117].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty[0] & /*filteredItems*/ 8192 && t1_value !== (t1_value = /*item*/ ctx[117].name + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*filteredItems*/ 8192 && t3_value !== (t3_value = /*item*/ ctx[117].location + "")) set_data_dev(t3, t3_value);
    			if (dirty[0] & /*filteredItems*/ 8192 && t5_value !== (t5_value = /*item*/ ctx[117].quantity + "")) set_data_dev(t5, t5_value);

    			if (dirty[0] & /*filteredItems*/ 8192 && div2_class_value !== (div2_class_value = "progress-bar " + (/*item*/ ctx[117].percentRemaining <= 20
    			? 'low'
    			: /*item*/ ctx[117].percentRemaining <= 50
    				? 'medium'
    				: 'high') + " svelte-ph2e9d")) {
    				attr_dev(div2, "class", div2_class_value);
    			}

    			if (dirty[0] & /*filteredItems*/ 8192) {
    				set_style(div2, "width", /*item*/ ctx[117].percentRemaining + "%");
    			}

    			if (dirty[0] & /*filteredItems*/ 8192 && t8_value !== (t8_value = /*item*/ ctx[117].percentRemaining + "")) set_data_dev(t8, t8_value);

    			if (dirty[0] & /*filteredItems*/ 8192 && t11_value !== (t11_value = (calculateDaysUntilExpiry(/*item*/ ctx[117].expiry) > 0
    			? `Expires in ${calculateDaysUntilExpiry(/*item*/ ctx[117].expiry)} days`
    			: "Expired!") + "")) set_data_dev(t11, t11_value);

    			if (dirty[0] & /*filteredItems*/ 8192 && span2_class_value !== (span2_class_value = "expiry-date " + getExpiryStatusClass(/*item*/ ctx[117].expiry) + " svelte-ph2e9d")) {
    				attr_dev(span2, "class", span2_class_value);
    			}

    			if (dirty[0] & /*filteredItems*/ 8192 && t13_value !== (t13_value = formatCurrency(/*item*/ ctx[117].price) + "")) set_data_dev(t13, t13_value);

    			if (dirty[0] & /*adjustAmount*/ 16384 && to_number(input.value) !== /*adjustAmount*/ ctx[14]) {
    				set_input_value(input, /*adjustAmount*/ ctx[14]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_11.name,
    		type: "each",
    		source: "(897:6) {#each filteredItems as item}",
    		ctx
    	});

    	return block;
    }

    // (1015:2) {#if activeTab === "recipes"}
    function create_if_block_21(ctx) {
    	let section;
    	let div2;
    	let h2;
    	let t1;
    	let div1;
    	let div0;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let t6;
    	let div3;
    	let t7;
    	let div4;
    	let t8;
    	let h3;
    	let t10;
    	let div9;
    	let div5;
    	let h40;
    	let t12;
    	let p0;
    	let t14;
    	let div6;
    	let h41;
    	let t16;
    	let p1;
    	let t18;
    	let div7;
    	let h42;
    	let t20;
    	let p2;
    	let t22;
    	let div8;
    	let h43;
    	let t24;
    	let p3;
    	let each_value_9 = /*filteredRecipes*/ ctx[22];
    	validate_each_argument(each_value_9);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_9.length; i += 1) {
    		each_blocks[i] = create_each_block_9(get_each_context_9(ctx, each_value_9, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Recipe Suggestions";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "All Recipes";
    			option1 = element("option");
    			option1.textContent = "Quick Meals (< 30 min)";
    			option2 = element("option");
    			option2.textContent = "Matches Inventory";
    			option3 = element("option");
    			option3.textContent = "Favorites";
    			t6 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t7 = space();
    			div4 = element("div");
    			t8 = space();
    			h3 = element("h3");
    			h3.textContent = "Recipe Categories";
    			t10 = space();
    			div9 = element("div");
    			div5 = element("div");
    			h40 = element("h4");
    			h40.textContent = "Quick Meals";
    			t12 = space();
    			p0 = element("p");
    			p0.textContent = "Ready in 30 minutes or less";
    			t14 = space();
    			div6 = element("div");
    			h41 = element("h4");
    			h41.textContent = "Vegetarian";
    			t16 = space();
    			p1 = element("p");
    			p1.textContent = "Plant-based recipes";
    			t18 = space();
    			div7 = element("div");
    			h42 = element("h4");
    			h42.textContent = "High Protein";
    			t20 = space();
    			p2 = element("p");
    			p2.textContent = "20+ grams of protein per serving";
    			t22 = space();
    			div8 = element("div");
    			h43 = element("h4");
    			h43.textContent = "Low Carb";
    			t24 = space();
    			p3 = element("p");
    			p3.textContent = "Under 20g of carbs per serving";
    			attr_dev(h2, "class", "svelte-ph2e9d");
    			add_location(h2, file, 1017, 5, 23272);
    			option0.__value = "All Recipes";
    			option0.value = option0.__value;
    			attr_dev(option0, "class", "svelte-ph2e9d");
    			add_location(option0, file, 1021, 8, 23388);
    			option1.__value = "Quick Meals (< 30 min)";
    			option1.value = option1.__value;
    			attr_dev(option1, "class", "svelte-ph2e9d");
    			add_location(option1, file, 1022, 8, 23425);
    			option2.__value = "Matches Inventory";
    			option2.value = option2.__value;
    			attr_dev(option2, "class", "svelte-ph2e9d");
    			add_location(option2, file, 1023, 8, 23475);
    			option3.__value = "Favorites";
    			option3.value = option3.__value;
    			attr_dev(option3, "class", "svelte-ph2e9d");
    			add_location(option3, file, 1024, 8, 23518);
    			attr_dev(select, "class", "svelte-ph2e9d");
    			add_location(select, file, 1020, 7, 23371);
    			attr_dev(div0, "class", "select-container svelte-ph2e9d");
    			add_location(div0, file, 1019, 6, 23333);
    			attr_dev(div1, "class", "filters svelte-ph2e9d");
    			add_location(div1, file, 1018, 5, 23305);
    			attr_dev(div2, "class", "section-header svelte-ph2e9d");
    			add_location(div2, file, 1016, 4, 23238);
    			attr_dev(div3, "class", "recipe-grid svelte-ph2e9d");
    			add_location(div3, file, 1030, 4, 23603);
    			attr_dev(div4, "class", "section-divider svelte-ph2e9d");
    			add_location(div4, file, 1097, 4, 25468);
    			attr_dev(h3, "class", "sub-section-title svelte-ph2e9d");
    			add_location(h3, file, 1099, 4, 25509);
    			attr_dev(h40, "class", "svelte-ph2e9d");
    			add_location(h40, file, 1102, 6, 25645);
    			attr_dev(p0, "class", "svelte-ph2e9d");
    			add_location(p0, file, 1103, 6, 25672);
    			attr_dev(div5, "class", "category-card quick-meals svelte-ph2e9d");
    			add_location(div5, file, 1101, 5, 25599);
    			attr_dev(h41, "class", "svelte-ph2e9d");
    			add_location(h41, file, 1106, 6, 25769);
    			attr_dev(p1, "class", "svelte-ph2e9d");
    			add_location(p1, file, 1107, 6, 25795);
    			attr_dev(div6, "class", "category-card vegetarian svelte-ph2e9d");
    			add_location(div6, file, 1105, 5, 25724);
    			attr_dev(h42, "class", "svelte-ph2e9d");
    			add_location(h42, file, 1110, 6, 25886);
    			attr_dev(p2, "class", "svelte-ph2e9d");
    			add_location(p2, file, 1111, 6, 25914);
    			attr_dev(div7, "class", "category-card high-protein svelte-ph2e9d");
    			add_location(div7, file, 1109, 5, 25839);
    			attr_dev(h43, "class", "svelte-ph2e9d");
    			add_location(h43, file, 1114, 6, 26014);
    			attr_dev(p3, "class", "svelte-ph2e9d");
    			add_location(p3, file, 1115, 6, 26038);
    			attr_dev(div8, "class", "category-card low-carb svelte-ph2e9d");
    			add_location(div8, file, 1113, 5, 25971);
    			attr_dev(div9, "class", "category-grid svelte-ph2e9d");
    			add_location(div9, file, 1100, 4, 25566);
    			attr_dev(section, "class", "fade-in svelte-ph2e9d");
    			add_location(section, file, 1015, 3, 23208);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div2);
    			append_dev(div2, h2);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			append_dev(section, t6);
    			append_dev(section, div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div3, null);
    				}
    			}

    			append_dev(section, t7);
    			append_dev(section, div4);
    			append_dev(section, t8);
    			append_dev(section, h3);
    			append_dev(section, t10);
    			append_dev(section, div9);
    			append_dev(div9, div5);
    			append_dev(div5, h40);
    			append_dev(div5, t12);
    			append_dev(div5, p0);
    			append_dev(div9, t14);
    			append_dev(div9, div6);
    			append_dev(div6, h41);
    			append_dev(div6, t16);
    			append_dev(div6, p1);
    			append_dev(div9, t18);
    			append_dev(div9, div7);
    			append_dev(div7, h42);
    			append_dev(div7, t20);
    			append_dev(div7, p2);
    			append_dev(div9, t22);
    			append_dev(div9, div8);
    			append_dev(div8, h43);
    			append_dev(div8, t24);
    			append_dev(div8, p3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredRecipes*/ 4194304 | dirty[1] & /*toggleRecipeDetail*/ 1) {
    				each_value_9 = /*filteredRecipes*/ ctx[22];
    				validate_each_argument(each_value_9);
    				let i;

    				for (i = 0; i < each_value_9.length; i += 1) {
    					const child_ctx = get_each_context_9(ctx, each_value_9, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_9(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_9.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_21.name,
    		type: "if",
    		source: "(1015:2) {#if activeTab === \\\"recipes\\\"}",
    		ctx
    	});

    	return block;
    }

    // (1046:9) {#if recipe.cookTime}
    function create_if_block_25(ctx) {
    	let span;
    	let i;
    	let t0;
    	let t1_value = /*recipe*/ ctx[111].cookTime + "";
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(i, "class", "far fa-clock");
    			add_location(i, file, 1047, 12, 24118);
    			add_location(span, file, 1046, 10, 24100);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredRecipes*/ 4194304 && t1_value !== (t1_value = /*recipe*/ ctx[111].cookTime + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_25.name,
    		type: "if",
    		source: "(1046:9) {#if recipe.cookTime}",
    		ctx
    	});

    	return block;
    }

    // (1052:9) {#if recipe.difficulty}
    function create_if_block_24(ctx) {
    	let span;
    	let i;
    	let t0;
    	let t1_value = /*recipe*/ ctx[111].difficulty + "";
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(i, "class", "fas fa-utensils");
    			add_location(i, file, 1053, 12, 24270);
    			add_location(span, file, 1052, 10, 24252);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredRecipes*/ 4194304 && t1_value !== (t1_value = /*recipe*/ ctx[111].difficulty + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_24.name,
    		type: "if",
    		source: "(1052:9) {#if recipe.difficulty}",
    		ctx
    	});

    	return block;
    }

    // (1058:9) {#if recipe.calories}
    function create_if_block_23(ctx) {
    	let span;
    	let i;
    	let t0;
    	let t1_value = /*recipe*/ ctx[111].calories + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = text(" cal");
    			attr_dev(i, "class", "fas fa-fire");
    			add_location(i, file, 1059, 12, 24425);
    			add_location(span, file, 1058, 10, 24407);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredRecipes*/ 4194304 && t1_value !== (t1_value = /*recipe*/ ctx[111].calories + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_23.name,
    		type: "if",
    		source: "(1058:9) {#if recipe.calories}",
    		ctx
    	});

    	return block;
    }

    // (1068:10) {#each recipe.ingredients            .filter((i) => i.required)            .slice(0, 3) as ingredient}
    function create_each_block_10(ctx) {
    	let span;
    	let t_value = /*ingredient*/ ctx[106].name + "";
    	let t;
    	let span_class_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);

    			attr_dev(span, "class", span_class_value = "ingredient-tag " + (/*ingredient*/ ctx[106].inInventory
    			? 'available'
    			: 'missing') + " svelte-ph2e9d");

    			add_location(span, file, 1070, 11, 24772);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredRecipes*/ 4194304 && t_value !== (t_value = /*ingredient*/ ctx[106].name + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*filteredRecipes*/ 4194304 && span_class_value !== (span_class_value = "ingredient-tag " + (/*ingredient*/ ctx[106].inInventory
    			? 'available'
    			: 'missing') + " svelte-ph2e9d")) {
    				attr_dev(span, "class", span_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_10.name,
    		type: "each",
    		source: "(1068:10) {#each recipe.ingredients            .filter((i) => i.required)            .slice(0, 3) as ingredient}",
    		ctx
    	});

    	return block;
    }

    // (1079:10) {#if recipe.ingredients.filter((i) => i.required).length > 3}
    function create_if_block_22(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*recipe*/ ctx[111].ingredients.filter(func_2).length - 3 + "";
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("+");
    			t1 = text(t1_value);
    			attr_dev(span, "class", "ingredient-tag more svelte-ph2e9d");
    			add_location(span, file, 1079, 11, 25053);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredRecipes*/ 4194304 && t1_value !== (t1_value = /*recipe*/ ctx[111].ingredients.filter(func_2).length - 3 + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_22.name,
    		type: "if",
    		source: "(1079:10) {#if recipe.ingredients.filter((i) => i.required).length > 3}",
    		ctx
    	});

    	return block;
    }

    // (1032:5) {#each filteredRecipes as recipe}
    function create_each_block_9(ctx) {
    	let div6;
    	let div0;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let span;
    	let t1_value = /*recipe*/ ctx[111].matchPercentage + "";
    	let t1;
    	let t2;
    	let t3;
    	let div4;
    	let h3;
    	let t4_value = /*recipe*/ ctx[111].name + "";
    	let t4;
    	let t5;
    	let div1;
    	let t6;
    	let t7;
    	let t8;
    	let div3;
    	let p;
    	let t10;
    	let div2;
    	let t11;
    	let show_if = /*recipe*/ ctx[111].ingredients.filter(func).length > 3;
    	let t12;
    	let div5;
    	let button;
    	let i;
    	let t13;
    	let t14;
    	let mounted;
    	let dispose;
    	let if_block0 = /*recipe*/ ctx[111].cookTime && create_if_block_25(ctx);
    	let if_block1 = /*recipe*/ ctx[111].difficulty && create_if_block_24(ctx);
    	let if_block2 = /*recipe*/ ctx[111].calories && create_if_block_23(ctx);
    	let each_value_10 = /*recipe*/ ctx[111].ingredients.filter(func_1).slice(0, 3);
    	validate_each_argument(each_value_10);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_10.length; i += 1) {
    		each_blocks[i] = create_each_block_10(get_each_context_10(ctx, each_value_10, i));
    	}

    	let if_block3 = show_if && create_if_block_22(ctx);

    	function click_handler_11() {
    		return /*click_handler_11*/ ctx[60](/*recipe*/ ctx[111]);
    	}

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = text("% Match");
    			t3 = space();
    			div4 = element("div");
    			h3 = element("h3");
    			t4 = text(t4_value);
    			t5 = space();
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t6 = space();
    			if (if_block1) if_block1.c();
    			t7 = space();
    			if (if_block2) if_block2.c();
    			t8 = space();
    			div3 = element("div");
    			p = element("p");
    			p.textContent = "Main Ingredients:";
    			t10 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t11 = space();
    			if (if_block3) if_block3.c();
    			t12 = space();
    			div5 = element("div");
    			button = element("button");
    			i = element("i");
    			t13 = text(" Start Cooking");
    			t14 = space();
    			if (!src_url_equal(img.src, img_src_value = /*recipe*/ ctx[111].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*recipe*/ ctx[111].name);
    			attr_dev(img, "class", "svelte-ph2e9d");
    			add_location(img, file, 1037, 8, 23807);
    			attr_dev(span, "class", "match-badge svelte-ph2e9d");
    			add_location(span, file, 1038, 8, 23860);
    			attr_dev(div0, "class", "recipe-image svelte-ph2e9d");
    			add_location(div0, file, 1036, 7, 23772);
    			attr_dev(h3, "class", "svelte-ph2e9d");
    			add_location(h3, file, 1043, 8, 24002);
    			attr_dev(div1, "class", "recipe-meta svelte-ph2e9d");
    			add_location(div1, file, 1044, 8, 24033);
    			attr_dev(p, "class", "svelte-ph2e9d");
    			add_location(p, file, 1065, 9, 24584);
    			attr_dev(div2, "class", "ingredient-tags svelte-ph2e9d");
    			add_location(div2, file, 1066, 9, 24618);
    			attr_dev(div3, "class", "recipe-ingredients svelte-ph2e9d");
    			add_location(div3, file, 1064, 8, 24542);
    			attr_dev(div4, "class", "recipe-content svelte-ph2e9d");
    			add_location(div4, file, 1042, 7, 23965);
    			attr_dev(i, "class", "fas fa-utensils");
    			add_location(i, file, 1090, 9, 25348);
    			attr_dev(button, "class", "full-button svelte-ph2e9d");
    			add_location(button, file, 1089, 8, 25310);
    			attr_dev(div5, "class", "recipe-footer svelte-ph2e9d");
    			add_location(div5, file, 1088, 7, 25274);
    			attr_dev(div6, "class", "recipe-card svelte-ph2e9d");
    			add_location(div6, file, 1032, 6, 23674);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div0, span);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(div6, t3);
    			append_dev(div6, div4);
    			append_dev(div4, h3);
    			append_dev(h3, t4);
    			append_dev(div4, t5);
    			append_dev(div4, div1);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t6);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t7);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(div4, t8);
    			append_dev(div4, div3);
    			append_dev(div3, p);
    			append_dev(div3, t10);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div2, null);
    				}
    			}

    			append_dev(div2, t11);
    			if (if_block3) if_block3.m(div2, null);
    			append_dev(div6, t12);
    			append_dev(div6, div5);
    			append_dev(div5, button);
    			append_dev(button, i);
    			append_dev(button, t13);
    			append_dev(div6, t14);

    			if (!mounted) {
    				dispose = listen_dev(div6, "click", click_handler_11, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*filteredRecipes*/ 4194304 && !src_url_equal(img.src, img_src_value = /*recipe*/ ctx[111].image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*filteredRecipes*/ 4194304 && img_alt_value !== (img_alt_value = /*recipe*/ ctx[111].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty[0] & /*filteredRecipes*/ 4194304 && t1_value !== (t1_value = /*recipe*/ ctx[111].matchPercentage + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*filteredRecipes*/ 4194304 && t4_value !== (t4_value = /*recipe*/ ctx[111].name + "")) set_data_dev(t4, t4_value);

    			if (/*recipe*/ ctx[111].cookTime) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_25(ctx);
    					if_block0.c();
    					if_block0.m(div1, t6);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*recipe*/ ctx[111].difficulty) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_24(ctx);
    					if_block1.c();
    					if_block1.m(div1, t7);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*recipe*/ ctx[111].calories) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_23(ctx);
    					if_block2.c();
    					if_block2.m(div1, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty[0] & /*filteredRecipes*/ 4194304) {
    				each_value_10 = /*recipe*/ ctx[111].ingredients.filter(func_1).slice(0, 3);
    				validate_each_argument(each_value_10);
    				let i;

    				for (i = 0; i < each_value_10.length; i += 1) {
    					const child_ctx = get_each_context_10(ctx, each_value_10, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_10(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, t11);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_10.length;
    			}

    			if (dirty[0] & /*filteredRecipes*/ 4194304) show_if = /*recipe*/ ctx[111].ingredients.filter(func).length > 3;

    			if (show_if) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_22(ctx);
    					if_block3.c();
    					if_block3.m(div2, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			destroy_each(each_blocks, detaching);
    			if (if_block3) if_block3.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_9.name,
    		type: "each",
    		source: "(1032:5) {#each filteredRecipes as recipe}",
    		ctx
    	});

    	return block;
    }

    // (1123:2) {#if activeTab === "shopping"}
    function create_if_block_17(ctx) {
    	let section;
    	let div2;
    	let h2;
    	let t1;
    	let div1;
    	let div0;
    	let input;
    	let t2;
    	let button0;
    	let i0;
    	let t3;
    	let button1;
    	let i1;
    	let t4;
    	let div8;
    	let div7;
    	let div3;
    	let t6;
    	let div4;
    	let t8;
    	let div5;
    	let t10;
    	let div6;
    	let t12;
    	let t13;
    	let t14;
    	let div9;
    	let button2;
    	let i2;
    	let t15;
    	let t16;
    	let button3;
    	let i3;
    	let t17;
    	let t18;
    	let mounted;
    	let dispose;
    	let each_value_8 = /*filteredShoppingList*/ ctx[21];
    	validate_each_argument(each_value_8);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_8.length; i += 1) {
    		each_blocks[i] = create_each_block_8(get_each_context_8(ctx, each_value_8, i));
    	}

    	function select_block_type_2(ctx, dirty) {
    		if (/*filteredShoppingList*/ ctx[21].length > 0) return create_if_block_19;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*hasAutomaticItems*/ ctx[19] && create_if_block_18(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Shopping List";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t2 = space();
    			button0 = element("button");
    			i0 = element("i");
    			t3 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t4 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div3 = element("div");
    			div3.textContent = "Item";
    			t6 = space();
    			div4 = element("div");
    			div4.textContent = "Category";
    			t8 = space();
    			div5 = element("div");
    			div5.textContent = "Status";
    			t10 = space();
    			div6 = element("div");
    			div6.textContent = "Actions";
    			t12 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t13 = space();
    			if_block0.c();
    			t14 = space();
    			div9 = element("div");
    			button2 = element("button");
    			i2 = element("i");
    			t15 = text(" Sort by Category");
    			t16 = space();
    			button3 = element("button");
    			i3 = element("i");
    			t17 = text(" Clear Checked Items");
    			t18 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(h2, "class", "svelte-ph2e9d");
    			add_location(h2, file, 1125, 5, 26251);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Add item...");
    			attr_dev(input, "class", "add-item-input svelte-ph2e9d");
    			add_location(input, file, 1128, 7, 26342);
    			attr_dev(i0, "class", "fas fa-plus");
    			add_location(i0, file, 1143, 8, 26699);
    			attr_dev(button0, "class", "icon-button add svelte-ph2e9d");
    			add_location(button0, file, 1139, 7, 26605);
    			attr_dev(div0, "class", "add-item-form svelte-ph2e9d");
    			add_location(div0, file, 1127, 6, 26307);
    			attr_dev(i1, "class", "fas fa-ellipsis-v");
    			add_location(i1, file, 1147, 7, 26799);
    			attr_dev(button1, "class", "icon-button svelte-ph2e9d");
    			add_location(button1, file, 1146, 6, 26763);
    			attr_dev(div1, "class", "filters svelte-ph2e9d");
    			add_location(div1, file, 1126, 5, 26279);
    			attr_dev(div2, "class", "section-header svelte-ph2e9d");
    			add_location(div2, file, 1124, 4, 26217);
    			attr_dev(div3, "class", "list-column");
    			add_location(div3, file, 1154, 6, 26942);
    			attr_dev(div4, "class", "list-column");
    			add_location(div4, file, 1155, 6, 26984);
    			attr_dev(div5, "class", "list-column");
    			add_location(div5, file, 1156, 6, 27030);
    			attr_dev(div6, "class", "list-column");
    			add_location(div6, file, 1157, 6, 27074);
    			attr_dev(div7, "class", "list-header svelte-ph2e9d");
    			add_location(div7, file, 1153, 5, 26910);
    			attr_dev(div8, "class", "shopping-list svelte-ph2e9d");
    			add_location(div8, file, 1152, 4, 26877);
    			attr_dev(i2, "class", "fas fa-sort");
    			add_location(i2, file, 1251, 6, 29657);
    			attr_dev(button2, "class", "secondary-button svelte-ph2e9d");
    			add_location(button2, file, 1247, 5, 29553);
    			attr_dev(i3, "class", "fas fa-trash");
    			add_location(i3, file, 1257, 6, 29817);
    			attr_dev(button3, "class", "secondary-button svelte-ph2e9d");
    			add_location(button3, file, 1253, 5, 29722);
    			attr_dev(div9, "class", "list-actions svelte-ph2e9d");
    			add_location(div9, file, 1246, 4, 29521);
    			attr_dev(section, "class", "fade-in svelte-ph2e9d");
    			add_location(section, file, 1123, 3, 26187);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div2);
    			append_dev(div2, h2);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*newShoppingItem*/ ctx[18]);
    			append_dev(div0, t2);
    			append_dev(div0, button0);
    			append_dev(button0, i0);
    			append_dev(div1, t3);
    			append_dev(div1, button1);
    			append_dev(button1, i1);
    			append_dev(section, t4);
    			append_dev(section, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div3);
    			append_dev(div7, t6);
    			append_dev(div7, div4);
    			append_dev(div7, t8);
    			append_dev(div7, div5);
    			append_dev(div7, t10);
    			append_dev(div7, div6);
    			append_dev(div8, t12);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div8, null);
    				}
    			}

    			append_dev(section, t13);
    			if_block0.m(section, null);
    			append_dev(section, t14);
    			append_dev(section, div9);
    			append_dev(div9, button2);
    			append_dev(button2, i2);
    			append_dev(button2, t15);
    			append_dev(div9, t16);
    			append_dev(div9, button3);
    			append_dev(button3, i3);
    			append_dev(button3, t17);
    			append_dev(div9, t18);
    			if (if_block1) if_block1.m(div9, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler_2*/ ctx[61]),
    					listen_dev(input, "keypress", /*keypress_handler*/ ctx[62], false, false, false, false),
    					listen_dev(button0, "click", /*addToShoppingList*/ ctx[34], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_13*/ ctx[67], false, false, false, false),
    					listen_dev(button3, "click", /*click_handler_14*/ ctx[68], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*newShoppingItem*/ 262144 && input.value !== /*newShoppingItem*/ ctx[18]) {
    				set_input_value(input, /*newShoppingItem*/ ctx[18]);
    			}

    			if (dirty[0] & /*filteredShoppingList, toggleShoppingItemChecked*/ 69206016 | dirty[1] & /*deleteShoppingItem, showNotification*/ 6144) {
    				each_value_8 = /*filteredShoppingList*/ ctx[21];
    				validate_each_argument(each_value_8);
    				let i;

    				for (i = 0; i < each_value_8.length; i += 1) {
    					const child_ctx = get_each_context_8(ctx, each_value_8, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_8(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div8, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_8.length;
    			}

    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(section, t14);
    				}
    			}

    			if (/*hasAutomaticItems*/ ctx[19]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_18(ctx);
    					if_block1.c();
    					if_block1.m(div9, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_17.name,
    		type: "if",
    		source: "(1123:2) {#if activeTab === \\\"shopping\\\"}",
    		ctx
    	});

    	return block;
    }

    // (1180:8) {:else}
    function create_else_block_3(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Manual";
    			attr_dev(span, "class", "manual-tag svelte-ph2e9d");
    			add_location(span, file, 1180, 9, 27775);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(1180:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1174:8) {#if item.automatic}
    function create_if_block_20(ctx) {
    	let span0;
    	let i;
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = /*item*/ ctx[117].reason + "";
    	let t2;

    	const block = {
    		c: function create() {
    			span0 = element("span");
    			i = element("i");
    			t0 = text(" Auto");
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			attr_dev(i, "class", "fas fa-robot");
    			add_location(i, file, 1175, 10, 27634);
    			attr_dev(span0, "class", "auto-tag svelte-ph2e9d");
    			add_location(span0, file, 1174, 9, 27600);
    			attr_dev(span1, "class", "reason-tag svelte-ph2e9d");
    			add_location(span1, file, 1177, 9, 27694);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);
    			append_dev(span0, i);
    			append_dev(span0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, span1, anchor);
    			append_dev(span1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredShoppingList*/ 2097152 && t2_value !== (t2_value = /*item*/ ctx[117].reason + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(span1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_20.name,
    		type: "if",
    		source: "(1174:8) {#if item.automatic}",
    		ctx
    	});

    	return block;
    }

    // (1161:5) {#each filteredShoppingList as item}
    function create_each_block_8(ctx) {
    	let div4;
    	let div0;
    	let input;
    	let input_checked_value;
    	let t0;
    	let span;
    	let t1_value = /*item*/ ctx[117].name + "";
    	let t1;
    	let t2;
    	let div1;
    	let t3_value = /*item*/ ctx[117].category + "";
    	let t3;
    	let t4;
    	let div2;
    	let t5;
    	let div3;
    	let button0;
    	let i0;
    	let t6;
    	let button1;
    	let i1;
    	let t7;
    	let div4_class_value;
    	let mounted;
    	let dispose;

    	function change_handler() {
    		return /*change_handler*/ ctx[63](/*item*/ ctx[117]);
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (/*item*/ ctx[117].automatic) return create_if_block_20;
    		return create_else_block_3;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler_12(...args) {
    		return /*click_handler_12*/ ctx[64](/*item*/ ctx[117], ...args);
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			div1 = element("div");
    			t3 = text(t3_value);
    			t4 = space();
    			div2 = element("div");
    			if_block.c();
    			t5 = space();
    			div3 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t6 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t7 = space();
    			attr_dev(input, "type", "checkbox");
    			input.checked = input_checked_value = /*item*/ ctx[117].checked;
    			attr_dev(input, "class", "svelte-ph2e9d");
    			add_location(input, file, 1163, 8, 27281);
    			attr_dev(span, "class", "svelte-ph2e9d");
    			add_location(span, file, 1169, 8, 27436);
    			attr_dev(div0, "class", "list-column item-name svelte-ph2e9d");
    			add_location(div0, file, 1162, 7, 27237);
    			attr_dev(div1, "class", "list-column");
    			add_location(div1, file, 1171, 7, 27482);
    			attr_dev(div2, "class", "list-column");
    			add_location(div2, file, 1172, 7, 27536);
    			attr_dev(i0, "class", "fas fa-trash-alt");
    			add_location(i0, file, 1194, 9, 28158);
    			attr_dev(button0, "class", "icon-button small svelte-ph2e9d");
    			add_location(button0, file, 1184, 8, 27891);
    			attr_dev(i1, "class", "fas fa-ellipsis-v");
    			add_location(i1, file, 1197, 9, 28261);
    			attr_dev(button1, "class", "icon-button small svelte-ph2e9d");
    			add_location(button1, file, 1196, 8, 28217);
    			attr_dev(div3, "class", "list-column actions svelte-ph2e9d");
    			add_location(div3, file, 1183, 7, 27849);
    			attr_dev(div4, "class", div4_class_value = "list-item " + (/*item*/ ctx[117].checked ? 'checked' : '') + " svelte-ph2e9d");
    			add_location(div4, file, 1161, 6, 27174);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, input);
    			append_dev(div0, t0);
    			append_dev(div0, span);
    			append_dev(span, t1);
    			append_dev(div4, t2);
    			append_dev(div4, div1);
    			append_dev(div1, t3);
    			append_dev(div4, t4);
    			append_dev(div4, div2);
    			if_block.m(div2, null);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, button0);
    			append_dev(button0, i0);
    			append_dev(div3, t6);
    			append_dev(div3, button1);
    			append_dev(button1, i1);
    			append_dev(div4, t7);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", change_handler, false, false, false, false),
    					listen_dev(button0, "click", click_handler_12, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*filteredShoppingList*/ 2097152 && input_checked_value !== (input_checked_value = /*item*/ ctx[117].checked)) {
    				prop_dev(input, "checked", input_checked_value);
    			}

    			if (dirty[0] & /*filteredShoppingList*/ 2097152 && t1_value !== (t1_value = /*item*/ ctx[117].name + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*filteredShoppingList*/ 2097152 && t3_value !== (t3_value = /*item*/ ctx[117].category + "")) set_data_dev(t3, t3_value);

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div2, null);
    				}
    			}

    			if (dirty[0] & /*filteredShoppingList*/ 2097152 && div4_class_value !== (div4_class_value = "list-item " + (/*item*/ ctx[117].checked ? 'checked' : '') + " svelte-ph2e9d")) {
    				attr_dev(div4, "class", div4_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_8.name,
    		type: "each",
    		source: "(1161:5) {#each filteredShoppingList as item}",
    		ctx
    	});

    	return block;
    }

    // (1221:4) {:else}
    function create_else_block_2(ctx) {
    	let div1;
    	let i0;
    	let t0;
    	let p;
    	let t2;
    	let div0;
    	let input;
    	let t3;
    	let button;
    	let i1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			i0 = element("i");
    			t0 = space();
    			p = element("p");
    			p.textContent = "Your shopping list is empty.";
    			t2 = space();
    			div0 = element("div");
    			input = element("input");
    			t3 = space();
    			button = element("button");
    			i1 = element("i");
    			attr_dev(i0, "class", "fas fa-shopping-cart empty-icon svelte-ph2e9d");
    			add_location(i0, file, 1222, 6, 28943);
    			attr_dev(p, "class", "svelte-ph2e9d");
    			add_location(p, file, 1223, 6, 28997);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Add item...");
    			attr_dev(input, "class", "add-item-input svelte-ph2e9d");
    			add_location(input, file, 1225, 7, 29079);
    			attr_dev(i1, "class", "fas fa-plus");
    			add_location(i1, file, 1240, 8, 29436);
    			attr_dev(button, "class", "icon-button add svelte-ph2e9d");
    			add_location(button, file, 1236, 7, 29342);
    			attr_dev(div0, "class", "add-item-form wide svelte-ph2e9d");
    			add_location(div0, file, 1224, 6, 29039);
    			attr_dev(div1, "class", "empty-state svelte-ph2e9d");
    			add_location(div1, file, 1221, 5, 28911);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, i0);
    			append_dev(div1, t0);
    			append_dev(div1, p);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*newShoppingItem*/ ctx[18]);
    			append_dev(div0, t3);
    			append_dev(div0, button);
    			append_dev(button, i1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler_3*/ ctx[65]),
    					listen_dev(input, "keypress", /*keypress_handler_1*/ ctx[66], false, false, false, false),
    					listen_dev(button, "click", /*addToShoppingList*/ ctx[34], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*newShoppingItem*/ 262144 && input.value !== /*newShoppingItem*/ ctx[18]) {
    				set_input_value(input, /*newShoppingItem*/ ctx[18]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(1221:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1205:4) {#if filteredShoppingList.length > 0}
    function create_if_block_19(ctx) {
    	let div2;
    	let div0;
    	let t0_value = /*filteredShoppingList*/ ctx[21].filter(func_3).length + "";
    	let t0;
    	let t1;
    	let t2_value = /*filteredShoppingList*/ ctx[21].length + "";
    	let t2;
    	let t3;
    	let t4;
    	let div1;
    	let button0;
    	let i0;
    	let t5;
    	let t6;
    	let button1;
    	let i1;
    	let t7;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = text("\n\t\t\t\t\t\t\tof ");
    			t2 = text(t2_value);
    			t3 = text(" items checked");
    			t4 = space();
    			div1 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t5 = text(" Print List");
    			t6 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t7 = text(" Shop Online");
    			attr_dev(div0, "class", "counter svelte-ph2e9d");
    			add_location(div0, file, 1206, 6, 28449);
    			attr_dev(i0, "class", "fas fa-print");
    			add_location(i0, file, 1213, 8, 28699);
    			attr_dev(button0, "class", "secondary-button svelte-ph2e9d");
    			add_location(button0, file, 1212, 7, 28657);
    			attr_dev(i1, "class", "fas fa-shopping-cart");
    			add_location(i1, file, 1216, 8, 28803);
    			attr_dev(button1, "class", "primary-button svelte-ph2e9d");
    			add_location(button1, file, 1215, 7, 28763);
    			attr_dev(div1, "class", "action-buttons svelte-ph2e9d");
    			add_location(div1, file, 1211, 6, 28621);
    			attr_dev(div2, "class", "shopping-actions svelte-ph2e9d");
    			add_location(div2, file, 1205, 5, 28412);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(button0, i0);
    			append_dev(button0, t5);
    			append_dev(div1, t6);
    			append_dev(div1, button1);
    			append_dev(button1, i1);
    			append_dev(button1, t7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredShoppingList*/ 2097152 && t0_value !== (t0_value = /*filteredShoppingList*/ ctx[21].filter(func_3).length + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*filteredShoppingList*/ 2097152 && t2_value !== (t2_value = /*filteredShoppingList*/ ctx[21].length + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_19.name,
    		type: "if",
    		source: "(1205:4) {#if filteredShoppingList.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (1260:5) {#if hasAutomaticItems}
    function create_if_block_18(ctx) {
    	let button;
    	let i;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			i = element("i");
    			t = text(" Refresh Auto Items");
    			attr_dev(i, "class", "fas fa-sync");
    			add_location(i, file, 1264, 7, 30019);
    			attr_dev(button, "class", "secondary-button svelte-ph2e9d");
    			add_location(button, file, 1260, 6, 29916);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, i);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_15*/ ctx[69], false, false, false, false);
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
    		id: create_if_block_18.name,
    		type: "if",
    		source: "(1260:5) {#if hasAutomaticItems}",
    		ctx
    	});

    	return block;
    }

    // (1273:2) {#if activeTab === "nutrition"}
    function create_if_block_16(ctx) {
    	let section;
    	let div2;
    	let h2;
    	let t1;
    	let div1;
    	let div0;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t5;
    	let div23;
    	let div7;
    	let h30;
    	let t7;
    	let div3;
    	let span0;
    	let t9;
    	let span1;
    	let t11;
    	let div5;
    	let div4;
    	let t12;
    	let div6;
    	let span2;
    	let t14;
    	let div12;
    	let h31;
    	let t16;
    	let div8;
    	let span3;
    	let t18;
    	let span4;
    	let t20;
    	let div10;
    	let div9;
    	let t21;
    	let div11;
    	let span5;
    	let t23;
    	let div17;
    	let h32;
    	let t25;
    	let div13;
    	let span6;
    	let t27;
    	let span7;
    	let t29;
    	let div15;
    	let div14;
    	let t30;
    	let div16;
    	let span8;
    	let t32;
    	let div22;
    	let h33;
    	let t34;
    	let div18;
    	let span9;
    	let t36;
    	let span10;
    	let t38;
    	let div20;
    	let div19;
    	let t39;
    	let div21;
    	let span11;
    	let t41;
    	let div24;
    	let t42;
    	let h34;
    	let t44;
    	let div34;
    	let div27;
    	let div25;
    	let i0;
    	let t45;
    	let div26;
    	let h40;
    	let t47;
    	let p0;
    	let t49;
    	let div30;
    	let div28;
    	let i1;
    	let t50;
    	let div29;
    	let h41;
    	let t52;
    	let p1;
    	let t54;
    	let div33;
    	let div31;
    	let i2;
    	let t55;
    	let div32;
    	let h42;
    	let t57;
    	let p2;
    	let t59;
    	let div35;
    	let t60;
    	let h35;
    	let t62;
    	let div42;
    	let div41;
    	let div36;
    	let t64;
    	let div37;
    	let t66;
    	let div38;
    	let t68;
    	let div39;
    	let t70;
    	let div40;
    	let t72;
    	let t73;
    	let div43;
    	let button;
    	let i3;
    	let t74;
    	let mounted;
    	let dispose;
    	let each_value_7 = /*filteredFoodLog*/ ctx[20];
    	validate_each_argument(each_value_7);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_7.length; i += 1) {
    		each_blocks[i] = create_each_block_7(get_each_context_7(ctx, each_value_7, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Nutrition Insights";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Last 7 Days";
    			option1 = element("option");
    			option1.textContent = "Last 30 Days";
    			option2 = element("option");
    			option2.textContent = "This Month";
    			t5 = space();
    			div23 = element("div");
    			div7 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Calorie Intake";
    			t7 = space();
    			div3 = element("div");
    			span0 = element("span");
    			span0.textContent = "1,850";
    			t9 = space();
    			span1 = element("span");
    			span1.textContent = "cal/day";
    			t11 = space();
    			div5 = element("div");
    			div4 = element("div");
    			t12 = space();
    			div6 = element("div");
    			span2 = element("span");
    			span2.textContent = "75% of daily target";
    			t14 = space();
    			div12 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Protein";
    			t16 = space();
    			div8 = element("div");
    			span3 = element("span");
    			span3.textContent = "85";
    			t18 = space();
    			span4 = element("span");
    			span4.textContent = "g/day";
    			t20 = space();
    			div10 = element("div");
    			div9 = element("div");
    			t21 = space();
    			div11 = element("div");
    			span5 = element("span");
    			span5.textContent = "94% of daily target";
    			t23 = space();
    			div17 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Carbohydrates";
    			t25 = space();
    			div13 = element("div");
    			span6 = element("span");
    			span6.textContent = "210";
    			t27 = space();
    			span7 = element("span");
    			span7.textContent = "g/day";
    			t29 = space();
    			div15 = element("div");
    			div14 = element("div");
    			t30 = space();
    			div16 = element("div");
    			span8 = element("span");
    			span8.textContent = "65% of daily target";
    			t32 = space();
    			div22 = element("div");
    			h33 = element("h3");
    			h33.textContent = "Fat";
    			t34 = space();
    			div18 = element("div");
    			span9 = element("span");
    			span9.textContent = "62";
    			t36 = space();
    			span10 = element("span");
    			span10.textContent = "g/day";
    			t38 = space();
    			div20 = element("div");
    			div19 = element("div");
    			t39 = space();
    			div21 = element("div");
    			span11 = element("span");
    			span11.textContent = "60% of daily target";
    			t41 = space();
    			div24 = element("div");
    			t42 = space();
    			h34 = element("h3");
    			h34.textContent = "Nutrition Recommendations";
    			t44 = space();
    			div34 = element("div");
    			div27 = element("div");
    			div25 = element("div");
    			i0 = element("i");
    			t45 = space();
    			div26 = element("div");
    			h40 = element("h4");
    			h40.textContent = "Increase Vegetable Intake";
    			t47 = space();
    			p0 = element("p");
    			p0.textContent = "Try to include more green vegetables in your\n\t\t\t\t\t\t\t\tdaily meals to increase fiber and essential\n\t\t\t\t\t\t\t\tvitamins.";
    			t49 = space();
    			div30 = element("div");
    			div28 = element("div");
    			i1 = element("i");
    			t50 = space();
    			div29 = element("div");
    			h41 = element("h4");
    			h41.textContent = "Monitor Sodium Intake";
    			t52 = space();
    			p1 = element("p");
    			p1.textContent = "Your sodium intake is trending high. Consider\n\t\t\t\t\t\t\t\treducing processed food consumption.";
    			t54 = space();
    			div33 = element("div");
    			div31 = element("div");
    			i2 = element("i");
    			t55 = space();
    			div32 = element("div");
    			h42 = element("h4");
    			h42.textContent = "Good Protein Balance";
    			t57 = space();
    			p2 = element("p");
    			p2.textContent = "You're consistently meeting your protein\n\t\t\t\t\t\t\t\ttargets. Great job!";
    			t59 = space();
    			div35 = element("div");
    			t60 = space();
    			h35 = element("h3");
    			h35.textContent = "Recent Food Log";
    			t62 = space();
    			div42 = element("div");
    			div41 = element("div");
    			div36 = element("div");
    			div36.textContent = "Food Item";
    			t64 = space();
    			div37 = element("div");
    			div37.textContent = "Amount";
    			t66 = space();
    			div38 = element("div");
    			div38.textContent = "Calories";
    			t68 = space();
    			div39 = element("div");
    			div39.textContent = "Time";
    			t70 = space();
    			div40 = element("div");
    			div40.textContent = "Actions";
    			t72 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t73 = space();
    			div43 = element("div");
    			button = element("button");
    			i3 = element("i");
    			t74 = text(" Log Food Item");
    			attr_dev(h2, "class", "svelte-ph2e9d");
    			add_location(h2, file, 1275, 5, 30253);
    			option0.__value = "Last 7 Days";
    			option0.value = option0.__value;
    			attr_dev(option0, "class", "svelte-ph2e9d");
    			add_location(option0, file, 1279, 8, 30369);
    			option1.__value = "Last 30 Days";
    			option1.value = option1.__value;
    			attr_dev(option1, "class", "svelte-ph2e9d");
    			add_location(option1, file, 1280, 8, 30406);
    			option2.__value = "This Month";
    			option2.value = option2.__value;
    			attr_dev(option2, "class", "svelte-ph2e9d");
    			add_location(option2, file, 1281, 8, 30444);
    			attr_dev(select, "class", "svelte-ph2e9d");
    			add_location(select, file, 1278, 7, 30352);
    			attr_dev(div0, "class", "select-container svelte-ph2e9d");
    			add_location(div0, file, 1277, 6, 30314);
    			attr_dev(div1, "class", "filters svelte-ph2e9d");
    			add_location(div1, file, 1276, 5, 30286);
    			attr_dev(div2, "class", "section-header svelte-ph2e9d");
    			add_location(div2, file, 1274, 4, 30219);
    			attr_dev(h30, "class", "svelte-ph2e9d");
    			add_location(h30, file, 1289, 6, 30599);
    			attr_dev(span0, "class", "number svelte-ph2e9d");
    			add_location(span0, file, 1291, 7, 30655);
    			attr_dev(span1, "class", "unit svelte-ph2e9d");
    			add_location(span1, file, 1292, 7, 30696);
    			attr_dev(div3, "class", "stat svelte-ph2e9d");
    			add_location(div3, file, 1290, 6, 30629);
    			attr_dev(div4, "class", "progress-bar high svelte-ph2e9d");
    			set_style(div4, "width", "75%");
    			add_location(div4, file, 1295, 7, 30789);
    			attr_dev(div5, "class", "progress-container svelte-ph2e9d");
    			add_location(div5, file, 1294, 6, 30749);
    			add_location(span2, file, 1301, 7, 30920);
    			attr_dev(div6, "class", "stat-meta svelte-ph2e9d");
    			add_location(div6, file, 1300, 6, 30889);
    			attr_dev(div7, "class", "dashboard-card svelte-ph2e9d");
    			add_location(div7, file, 1288, 5, 30564);
    			attr_dev(h31, "class", "svelte-ph2e9d");
    			add_location(h31, file, 1306, 6, 31019);
    			attr_dev(span3, "class", "number svelte-ph2e9d");
    			add_location(span3, file, 1308, 7, 31068);
    			attr_dev(span4, "class", "unit svelte-ph2e9d");
    			add_location(span4, file, 1309, 7, 31106);
    			attr_dev(div8, "class", "stat svelte-ph2e9d");
    			add_location(div8, file, 1307, 6, 31042);
    			attr_dev(div9, "class", "progress-bar high svelte-ph2e9d");
    			set_style(div9, "width", "94%");
    			add_location(div9, file, 1312, 7, 31197);
    			attr_dev(div10, "class", "progress-container svelte-ph2e9d");
    			add_location(div10, file, 1311, 6, 31157);
    			add_location(span5, file, 1318, 7, 31328);
    			attr_dev(div11, "class", "stat-meta svelte-ph2e9d");
    			add_location(div11, file, 1317, 6, 31297);
    			attr_dev(div12, "class", "dashboard-card svelte-ph2e9d");
    			add_location(div12, file, 1305, 5, 30984);
    			attr_dev(h32, "class", "svelte-ph2e9d");
    			add_location(h32, file, 1323, 6, 31427);
    			attr_dev(span6, "class", "number svelte-ph2e9d");
    			add_location(span6, file, 1325, 7, 31482);
    			attr_dev(span7, "class", "unit svelte-ph2e9d");
    			add_location(span7, file, 1326, 7, 31521);
    			attr_dev(div13, "class", "stat svelte-ph2e9d");
    			add_location(div13, file, 1324, 6, 31456);
    			attr_dev(div14, "class", "progress-bar medium svelte-ph2e9d");
    			set_style(div14, "width", "65%");
    			add_location(div14, file, 1329, 7, 31612);
    			attr_dev(div15, "class", "progress-container svelte-ph2e9d");
    			add_location(div15, file, 1328, 6, 31572);
    			add_location(span8, file, 1335, 7, 31745);
    			attr_dev(div16, "class", "stat-meta svelte-ph2e9d");
    			add_location(div16, file, 1334, 6, 31714);
    			attr_dev(div17, "class", "dashboard-card svelte-ph2e9d");
    			add_location(div17, file, 1322, 5, 31392);
    			attr_dev(h33, "class", "svelte-ph2e9d");
    			add_location(h33, file, 1340, 6, 31844);
    			attr_dev(span9, "class", "number svelte-ph2e9d");
    			add_location(span9, file, 1342, 7, 31889);
    			attr_dev(span10, "class", "unit svelte-ph2e9d");
    			add_location(span10, file, 1343, 7, 31927);
    			attr_dev(div18, "class", "stat svelte-ph2e9d");
    			add_location(div18, file, 1341, 6, 31863);
    			attr_dev(div19, "class", "progress-bar medium svelte-ph2e9d");
    			set_style(div19, "width", "60%");
    			add_location(div19, file, 1346, 7, 32018);
    			attr_dev(div20, "class", "progress-container svelte-ph2e9d");
    			add_location(div20, file, 1345, 6, 31978);
    			add_location(span11, file, 1352, 7, 32151);
    			attr_dev(div21, "class", "stat-meta svelte-ph2e9d");
    			add_location(div21, file, 1351, 6, 32120);
    			attr_dev(div22, "class", "dashboard-card svelte-ph2e9d");
    			add_location(div22, file, 1339, 5, 31809);
    			attr_dev(div23, "class", "dashboard-grid svelte-ph2e9d");
    			add_location(div23, file, 1287, 4, 30530);
    			attr_dev(div24, "class", "section-divider svelte-ph2e9d");
    			add_location(div24, file, 1357, 4, 32225);
    			attr_dev(h34, "class", "sub-section-title svelte-ph2e9d");
    			add_location(h34, file, 1359, 4, 32266);
    			attr_dev(i0, "class", "fas fa-lightbulb");
    			add_location(i0, file, 1363, 7, 32451);
    			attr_dev(div25, "class", "recommendation-icon svelte-ph2e9d");
    			add_location(div25, file, 1362, 6, 32410);
    			attr_dev(h40, "class", "svelte-ph2e9d");
    			add_location(h40, file, 1366, 7, 32547);
    			attr_dev(p0, "class", "svelte-ph2e9d");
    			add_location(p0, file, 1367, 7, 32589);
    			attr_dev(div26, "class", "recommendation-content svelte-ph2e9d");
    			add_location(div26, file, 1365, 6, 32503);
    			attr_dev(div27, "class", "recommendation-item svelte-ph2e9d");
    			add_location(div27, file, 1361, 5, 32370);
    			attr_dev(i1, "class", "fas fa-lightbulb");
    			add_location(i1, file, 1377, 7, 32840);
    			attr_dev(div28, "class", "recommendation-icon svelte-ph2e9d");
    			add_location(div28, file, 1376, 6, 32799);
    			attr_dev(h41, "class", "svelte-ph2e9d");
    			add_location(h41, file, 1380, 7, 32936);
    			attr_dev(p1, "class", "svelte-ph2e9d");
    			add_location(p1, file, 1381, 7, 32974);
    			attr_dev(div29, "class", "recommendation-content svelte-ph2e9d");
    			add_location(div29, file, 1379, 6, 32892);
    			attr_dev(div30, "class", "recommendation-item svelte-ph2e9d");
    			add_location(div30, file, 1375, 5, 32759);
    			attr_dev(i2, "class", "fas fa-check-circle");
    			add_location(i2, file, 1390, 7, 33201);
    			attr_dev(div31, "class", "recommendation-icon svelte-ph2e9d");
    			add_location(div31, file, 1389, 6, 33160);
    			attr_dev(h42, "class", "svelte-ph2e9d");
    			add_location(h42, file, 1393, 7, 33300);
    			attr_dev(p2, "class", "svelte-ph2e9d");
    			add_location(p2, file, 1394, 7, 33337);
    			attr_dev(div32, "class", "recommendation-content svelte-ph2e9d");
    			add_location(div32, file, 1392, 6, 33256);
    			attr_dev(div33, "class", "recommendation-item svelte-ph2e9d");
    			add_location(div33, file, 1388, 5, 33120);
    			attr_dev(div34, "class", "recommendation-list svelte-ph2e9d");
    			add_location(div34, file, 1360, 4, 32331);
    			attr_dev(div35, "class", "section-divider svelte-ph2e9d");
    			add_location(div35, file, 1402, 4, 33471);
    			attr_dev(h35, "class", "sub-section-title svelte-ph2e9d");
    			add_location(h35, file, 1404, 4, 33512);
    			attr_dev(div36, "class", "log-column");
    			add_location(div36, file, 1408, 6, 33632);
    			attr_dev(div37, "class", "log-column");
    			add_location(div37, file, 1409, 6, 33678);
    			attr_dev(div38, "class", "log-column");
    			add_location(div38, file, 1410, 6, 33721);
    			attr_dev(div39, "class", "log-column");
    			add_location(div39, file, 1411, 6, 33766);
    			attr_dev(div40, "class", "log-column");
    			add_location(div40, file, 1412, 6, 33807);
    			attr_dev(div41, "class", "food-log-header svelte-ph2e9d");
    			add_location(div41, file, 1407, 5, 33596);
    			attr_dev(div42, "class", "food-log svelte-ph2e9d");
    			add_location(div42, file, 1406, 4, 33568);
    			attr_dev(i3, "class", "fas fa-plus");
    			add_location(i3, file, 1438, 6, 34566);
    			attr_dev(button, "class", "add-button svelte-ph2e9d");
    			add_location(button, file, 1434, 5, 34476);
    			attr_dev(div43, "class", "add-log-entry svelte-ph2e9d");
    			add_location(div43, file, 1433, 4, 34443);
    			attr_dev(section, "class", "fade-in svelte-ph2e9d");
    			add_location(section, file, 1273, 3, 30189);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div2);
    			append_dev(div2, h2);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(section, t5);
    			append_dev(section, div23);
    			append_dev(div23, div7);
    			append_dev(div7, h30);
    			append_dev(div7, t7);
    			append_dev(div7, div3);
    			append_dev(div3, span0);
    			append_dev(div3, t9);
    			append_dev(div3, span1);
    			append_dev(div7, t11);
    			append_dev(div7, div5);
    			append_dev(div5, div4);
    			append_dev(div7, t12);
    			append_dev(div7, div6);
    			append_dev(div6, span2);
    			append_dev(div23, t14);
    			append_dev(div23, div12);
    			append_dev(div12, h31);
    			append_dev(div12, t16);
    			append_dev(div12, div8);
    			append_dev(div8, span3);
    			append_dev(div8, t18);
    			append_dev(div8, span4);
    			append_dev(div12, t20);
    			append_dev(div12, div10);
    			append_dev(div10, div9);
    			append_dev(div12, t21);
    			append_dev(div12, div11);
    			append_dev(div11, span5);
    			append_dev(div23, t23);
    			append_dev(div23, div17);
    			append_dev(div17, h32);
    			append_dev(div17, t25);
    			append_dev(div17, div13);
    			append_dev(div13, span6);
    			append_dev(div13, t27);
    			append_dev(div13, span7);
    			append_dev(div17, t29);
    			append_dev(div17, div15);
    			append_dev(div15, div14);
    			append_dev(div17, t30);
    			append_dev(div17, div16);
    			append_dev(div16, span8);
    			append_dev(div23, t32);
    			append_dev(div23, div22);
    			append_dev(div22, h33);
    			append_dev(div22, t34);
    			append_dev(div22, div18);
    			append_dev(div18, span9);
    			append_dev(div18, t36);
    			append_dev(div18, span10);
    			append_dev(div22, t38);
    			append_dev(div22, div20);
    			append_dev(div20, div19);
    			append_dev(div22, t39);
    			append_dev(div22, div21);
    			append_dev(div21, span11);
    			append_dev(section, t41);
    			append_dev(section, div24);
    			append_dev(section, t42);
    			append_dev(section, h34);
    			append_dev(section, t44);
    			append_dev(section, div34);
    			append_dev(div34, div27);
    			append_dev(div27, div25);
    			append_dev(div25, i0);
    			append_dev(div27, t45);
    			append_dev(div27, div26);
    			append_dev(div26, h40);
    			append_dev(div26, t47);
    			append_dev(div26, p0);
    			append_dev(div34, t49);
    			append_dev(div34, div30);
    			append_dev(div30, div28);
    			append_dev(div28, i1);
    			append_dev(div30, t50);
    			append_dev(div30, div29);
    			append_dev(div29, h41);
    			append_dev(div29, t52);
    			append_dev(div29, p1);
    			append_dev(div34, t54);
    			append_dev(div34, div33);
    			append_dev(div33, div31);
    			append_dev(div31, i2);
    			append_dev(div33, t55);
    			append_dev(div33, div32);
    			append_dev(div32, h42);
    			append_dev(div32, t57);
    			append_dev(div32, p2);
    			append_dev(section, t59);
    			append_dev(section, div35);
    			append_dev(section, t60);
    			append_dev(section, h35);
    			append_dev(section, t62);
    			append_dev(section, div42);
    			append_dev(div42, div41);
    			append_dev(div41, div36);
    			append_dev(div41, t64);
    			append_dev(div41, div37);
    			append_dev(div41, t66);
    			append_dev(div41, div38);
    			append_dev(div41, t68);
    			append_dev(div41, div39);
    			append_dev(div41, t70);
    			append_dev(div41, div40);
    			append_dev(div42, t72);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div42, null);
    				}
    			}

    			append_dev(section, t73);
    			append_dev(section, div43);
    			append_dev(div43, button);
    			append_dev(button, i3);
    			append_dev(button, t74);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_16*/ ctx[70], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredFoodLog*/ 1048576) {
    				each_value_7 = /*filteredFoodLog*/ ctx[20];
    				validate_each_argument(each_value_7);
    				let i;

    				for (i = 0; i < each_value_7.length; i += 1) {
    					const child_ctx = get_each_context_7(ctx, each_value_7, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_7(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div42, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_7.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_16.name,
    		type: "if",
    		source: "(1273:2) {#if activeTab === \\\"nutrition\\\"}",
    		ctx
    	});

    	return block;
    }

    // (1416:5) {#each filteredFoodLog as entry}
    function create_each_block_7(ctx) {
    	let div5;
    	let div0;
    	let t0_value = /*entry*/ ctx[114].name + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2_value = /*entry*/ ctx[114].amount + "";
    	let t2;
    	let t3;
    	let div2;
    	let t4_value = /*entry*/ ctx[114].calories + "";
    	let t4;
    	let t5;
    	let t6;
    	let div3;
    	let t7_value = /*entry*/ ctx[114].time + "";
    	let t7;
    	let t8;
    	let div4;
    	let button0;
    	let i0;
    	let t9;
    	let button1;
    	let i1;
    	let t10;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			div2 = element("div");
    			t4 = text(t4_value);
    			t5 = text(" cal");
    			t6 = space();
    			div3 = element("div");
    			t7 = text(t7_value);
    			t8 = space();
    			div4 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t9 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t10 = space();
    			attr_dev(div0, "class", "log-column");
    			add_location(div0, file, 1417, 7, 33937);
    			attr_dev(div1, "class", "log-column");
    			add_location(div1, file, 1418, 7, 33987);
    			attr_dev(div2, "class", "log-column");
    			add_location(div2, file, 1419, 7, 34039);
    			attr_dev(div3, "class", "log-column");
    			add_location(div3, file, 1420, 7, 34097);
    			attr_dev(i0, "class", "fas fa-pencil-alt");
    			add_location(i0, file, 1423, 9, 34232);
    			attr_dev(button0, "class", "icon-button small svelte-ph2e9d");
    			add_location(button0, file, 1422, 8, 34188);
    			attr_dev(i1, "class", "fas fa-trash-alt");
    			add_location(i1, file, 1426, 9, 34336);
    			attr_dev(button1, "class", "icon-button small svelte-ph2e9d");
    			add_location(button1, file, 1425, 8, 34292);
    			attr_dev(div4, "class", "log-column actions");
    			add_location(div4, file, 1421, 7, 34147);
    			attr_dev(div5, "class", "food-log-item svelte-ph2e9d");
    			add_location(div5, file, 1416, 6, 33902);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div0, t0);
    			append_dev(div5, t1);
    			append_dev(div5, div1);
    			append_dev(div1, t2);
    			append_dev(div5, t3);
    			append_dev(div5, div2);
    			append_dev(div2, t4);
    			append_dev(div2, t5);
    			append_dev(div5, t6);
    			append_dev(div5, div3);
    			append_dev(div3, t7);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div4, button0);
    			append_dev(button0, i0);
    			append_dev(div4, t9);
    			append_dev(div4, button1);
    			append_dev(button1, i1);
    			append_dev(div5, t10);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredFoodLog*/ 1048576 && t0_value !== (t0_value = /*entry*/ ctx[114].name + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*filteredFoodLog*/ 1048576 && t2_value !== (t2_value = /*entry*/ ctx[114].amount + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*filteredFoodLog*/ 1048576 && t4_value !== (t4_value = /*entry*/ ctx[114].calories + "")) set_data_dev(t4, t4_value);
    			if (dirty[0] & /*filteredFoodLog*/ 1048576 && t7_value !== (t7_value = /*entry*/ ctx[114].time + "")) set_data_dev(t7, t7_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_7.name,
    		type: "each",
    		source: "(1416:5) {#each filteredFoodLog as entry}",
    		ctx
    	});

    	return block;
    }

    // (1447:1) {#if isDetailModalOpen && selectedItem}
    function create_if_block_12(ctx) {
    	let div16;
    	let div15;
    	let div0;
    	let h3;
    	let t0_value = /*selectedItem*/ ctx[11].name + "";
    	let t0;
    	let t1;
    	let t2;
    	let button0;
    	let i0;
    	let t3;
    	let div14;
    	let div13;
    	let div2;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t4;
    	let div1;
    	let h40;
    	let t6;
    	let button1;
    	let i1;
    	let t7;
    	let t8;
    	let button2;
    	let i2;
    	let t9;
    	let t10;
    	let button3;
    	let i3;
    	let t11;
    	let t12;
    	let div12;
    	let div7;
    	let div3;
    	let p0;
    	let t14;
    	let p1;
    	let t15_value = /*selectedItem*/ ctx[11].category + "";
    	let t15;
    	let t16;
    	let div4;
    	let p2;
    	let t18;
    	let p3;
    	let t19_value = /*selectedItem*/ ctx[11].location + "";
    	let t19;
    	let t20;
    	let div5;
    	let p4;
    	let t22;
    	let p5;
    	let t23_value = /*selectedItem*/ ctx[11].quantity + "";
    	let t23;
    	let t24;
    	let div6;
    	let p6;
    	let t26;
    	let p7;
    	let t27_value = new Date(/*selectedItem*/ ctx[11].expiry).toLocaleDateString() + "";
    	let t27;
    	let t28;
    	let show_if;
    	let p7_class_value;
    	let t29;
    	let t30;
    	let t31;
    	let div10;
    	let h41;
    	let t33;
    	let div9;
    	let div8;
    	let div8_class_value;
    	let t34;
    	let p8;
    	let t35_value = /*selectedItem*/ ctx[11].percentRemaining + "";
    	let t35;
    	let t36;
    	let t37_value = /*selectedItem*/ ctx[11].quantity + "";
    	let t37;
    	let t38;
    	let t39;
    	let div11;
    	let h42;
    	let t41;
    	let mounted;
    	let dispose;

    	function select_block_type_3(ctx, dirty) {
    		if (dirty[0] & /*selectedItem*/ 2048) show_if = null;
    		if (show_if == null) show_if = !!(calculateDaysUntilExpiry(/*selectedItem*/ ctx[11].expiry) > 0);
    		if (show_if) return create_if_block_15;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_3(ctx, [-1, -1, -1, -1, -1]);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*selectedItem*/ ctx[11].brand && create_if_block_14(ctx);
    	let if_block2 = /*selectedItem*/ ctx[11].price && create_if_block_13(ctx);
    	let each_value_6 = /*filteredRecipes*/ ctx[22].filter(/*func_4*/ ctx[75]);
    	validate_each_argument(each_value_6);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
    	}

    	const block = {
    		c: function create() {
    			div16 = element("div");
    			div15 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = text(" Details");
    			t2 = space();
    			button0 = element("button");
    			i0 = element("i");
    			t3 = space();
    			div14 = element("div");
    			div13 = element("div");
    			div2 = element("div");
    			img = element("img");
    			t4 = space();
    			div1 = element("div");
    			h40 = element("h4");
    			h40.textContent = "Quick Actions";
    			t6 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t7 = text(" Use Item");
    			t8 = space();
    			button2 = element("button");
    			i2 = element("i");
    			t9 = text(" Edit Item");
    			t10 = space();
    			button3 = element("button");
    			i3 = element("i");
    			t11 = text(" Delete Item");
    			t12 = space();
    			div12 = element("div");
    			div7 = element("div");
    			div3 = element("div");
    			p0 = element("p");
    			p0.textContent = "Category";
    			t14 = space();
    			p1 = element("p");
    			t15 = text(t15_value);
    			t16 = space();
    			div4 = element("div");
    			p2 = element("p");
    			p2.textContent = "Location";
    			t18 = space();
    			p3 = element("p");
    			t19 = text(t19_value);
    			t20 = space();
    			div5 = element("div");
    			p4 = element("p");
    			p4.textContent = "Quantity";
    			t22 = space();
    			p5 = element("p");
    			t23 = text(t23_value);
    			t24 = space();
    			div6 = element("div");
    			p6 = element("p");
    			p6.textContent = "Expiry Date";
    			t26 = space();
    			p7 = element("p");
    			t27 = text(t27_value);
    			t28 = space();
    			if_block0.c();
    			t29 = space();
    			if (if_block1) if_block1.c();
    			t30 = space();
    			if (if_block2) if_block2.c();
    			t31 = space();
    			div10 = element("div");
    			h41 = element("h4");
    			h41.textContent = "Remaining Quantity";
    			t33 = space();
    			div9 = element("div");
    			div8 = element("div");
    			t34 = space();
    			p8 = element("p");
    			t35 = text(t35_value);
    			t36 = text("% of ");
    			t37 = text(t37_value);
    			t38 = text("\n\t\t\t\t\t\t\t\t\tremaining");
    			t39 = space();
    			div11 = element("div");
    			h42 = element("h4");
    			h42.textContent = "Recipe Suggestions";
    			t41 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h3, "class", "svelte-ph2e9d");
    			add_location(h3, file, 1450, 5, 34899);
    			attr_dev(i0, "class", "fas fa-times");
    			add_location(i0, file, 1455, 6, 35032);
    			attr_dev(button0, "class", "close-button svelte-ph2e9d");
    			add_location(button0, file, 1451, 5, 34941);
    			attr_dev(div0, "class", "modal-header svelte-ph2e9d");
    			add_location(div0, file, 1449, 4, 34867);
    			if (!src_url_equal(img.src, img_src_value = /*selectedItem*/ ctx[11].image.replace("/50", "/200"))) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*selectedItem*/ ctx[11].name);
    			attr_dev(img, "class", "svelte-ph2e9d");
    			add_location(img, file, 1462, 7, 35197);
    			attr_dev(h40, "class", "svelte-ph2e9d");
    			add_location(h40, file, 1468, 8, 35344);
    			attr_dev(i1, "class", "fas fa-minus-circle");
    			add_location(i1, file, 1476, 9, 35544);
    			attr_dev(button1, "class", "action-button primary svelte-ph2e9d");
    			add_location(button1, file, 1469, 8, 35375);
    			attr_dev(i2, "class", "fas fa-pencil-alt");
    			add_location(i2, file, 1479, 9, 35655);
    			attr_dev(button2, "class", "action-button svelte-ph2e9d");
    			add_location(button2, file, 1478, 8, 35615);
    			attr_dev(i3, "class", "fas fa-trash-alt");
    			add_location(i3, file, 1482, 9, 35772);
    			attr_dev(button3, "class", "action-button danger svelte-ph2e9d");
    			add_location(button3, file, 1481, 8, 35725);
    			attr_dev(div1, "class", "quick-actions svelte-ph2e9d");
    			add_location(div1, file, 1467, 7, 35308);
    			attr_dev(div2, "class", "item-image-column svelte-ph2e9d");
    			add_location(div2, file, 1461, 6, 35158);
    			attr_dev(p0, "class", "info-label svelte-ph2e9d");
    			add_location(p0, file, 1490, 9, 35971);
    			attr_dev(p1, "class", "info-value svelte-ph2e9d");
    			add_location(p1, file, 1491, 9, 36015);
    			attr_dev(div3, "class", "info-box svelte-ph2e9d");
    			add_location(div3, file, 1489, 8, 35939);
    			attr_dev(p2, "class", "info-label svelte-ph2e9d");
    			add_location(p2, file, 1496, 9, 36141);
    			attr_dev(p3, "class", "info-value svelte-ph2e9d");
    			add_location(p3, file, 1497, 9, 36185);
    			attr_dev(div4, "class", "info-box svelte-ph2e9d");
    			add_location(div4, file, 1495, 8, 36109);
    			attr_dev(p4, "class", "info-label svelte-ph2e9d");
    			add_location(p4, file, 1502, 9, 36311);
    			attr_dev(p5, "class", "info-value svelte-ph2e9d");
    			add_location(p5, file, 1503, 9, 36355);
    			attr_dev(div5, "class", "info-box svelte-ph2e9d");
    			add_location(div5, file, 1501, 8, 36279);
    			attr_dev(p6, "class", "info-label svelte-ph2e9d");
    			add_location(p6, file, 1508, 9, 36481);
    			attr_dev(p7, "class", p7_class_value = "info-value " + getExpiryStatusClass(/*selectedItem*/ ctx[11].expiry) + " svelte-ph2e9d");
    			add_location(p7, file, 1509, 9, 36528);
    			attr_dev(div6, "class", "info-box svelte-ph2e9d");
    			add_location(div6, file, 1507, 8, 36449);
    			attr_dev(div7, "class", "info-grid svelte-ph2e9d");
    			add_location(div7, file, 1488, 7, 35907);
    			attr_dev(h41, "class", "svelte-ph2e9d");
    			add_location(h41, file, 1573, 8, 38249);

    			attr_dev(div8, "class", div8_class_value = "progress-bar " + (/*selectedItem*/ ctx[11].percentRemaining <= 20
    			? 'low'
    			: /*selectedItem*/ ctx[11].percentRemaining <= 50
    				? 'medium'
    				: 'high') + " svelte-ph2e9d");

    			set_style(div8, "width", /*selectedItem*/ ctx[11].percentRemaining + "%");
    			add_location(div8, file, 1575, 9, 38332);
    			attr_dev(div9, "class", "progress-container full svelte-ph2e9d");
    			add_location(div9, file, 1574, 8, 38285);
    			attr_dev(p8, "class", "svelte-ph2e9d");
    			add_location(p8, file, 1586, 8, 38640);
    			attr_dev(div10, "class", "progress-box svelte-ph2e9d");
    			add_location(div10, file, 1572, 7, 38214);
    			attr_dev(h42, "class", "svelte-ph2e9d");
    			add_location(h42, file, 1593, 8, 38805);
    			attr_dev(div11, "class", "related-recipes svelte-ph2e9d");
    			add_location(div11, file, 1592, 7, 38767);
    			attr_dev(div12, "class", "item-info-column");
    			add_location(div12, file, 1487, 6, 35869);
    			attr_dev(div13, "class", "item-columns svelte-ph2e9d");
    			add_location(div13, file, 1460, 5, 35125);
    			attr_dev(div14, "class", "modal-content svelte-ph2e9d");
    			add_location(div14, file, 1459, 4, 35092);
    			attr_dev(div15, "class", "modal svelte-ph2e9d");
    			add_location(div15, file, 1448, 3, 34805);
    			attr_dev(div16, "class", "modal-overlay svelte-ph2e9d");
    			add_location(div16, file, 1447, 2, 34737);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div16, anchor);
    			append_dev(div16, div15);
    			append_dev(div15, div0);
    			append_dev(div0, h3);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			append_dev(div0, t2);
    			append_dev(div0, button0);
    			append_dev(button0, i0);
    			append_dev(div15, t3);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div2);
    			append_dev(div2, img);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, h40);
    			append_dev(div1, t6);
    			append_dev(div1, button1);
    			append_dev(button1, i1);
    			append_dev(button1, t7);
    			append_dev(div1, t8);
    			append_dev(div1, button2);
    			append_dev(button2, i2);
    			append_dev(button2, t9);
    			append_dev(div1, t10);
    			append_dev(div1, button3);
    			append_dev(button3, i3);
    			append_dev(button3, t11);
    			append_dev(div13, t12);
    			append_dev(div13, div12);
    			append_dev(div12, div7);
    			append_dev(div7, div3);
    			append_dev(div3, p0);
    			append_dev(div3, t14);
    			append_dev(div3, p1);
    			append_dev(p1, t15);
    			append_dev(div7, t16);
    			append_dev(div7, div4);
    			append_dev(div4, p2);
    			append_dev(div4, t18);
    			append_dev(div4, p3);
    			append_dev(p3, t19);
    			append_dev(div7, t20);
    			append_dev(div7, div5);
    			append_dev(div5, p4);
    			append_dev(div5, t22);
    			append_dev(div5, p5);
    			append_dev(p5, t23);
    			append_dev(div7, t24);
    			append_dev(div7, div6);
    			append_dev(div6, p6);
    			append_dev(div6, t26);
    			append_dev(div6, p7);
    			append_dev(p7, t27);
    			append_dev(p7, t28);
    			if_block0.m(p7, null);
    			append_dev(div7, t29);
    			if (if_block1) if_block1.m(div7, null);
    			append_dev(div7, t30);
    			if (if_block2) if_block2.m(div7, null);
    			append_dev(div12, t31);
    			append_dev(div12, div10);
    			append_dev(div10, h41);
    			append_dev(div10, t33);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div10, t34);
    			append_dev(div10, p8);
    			append_dev(p8, t35);
    			append_dev(p8, t36);
    			append_dev(p8, t37);
    			append_dev(p8, t38);
    			append_dev(div12, t39);
    			append_dev(div12, div11);
    			append_dev(div11, h42);
    			append_dev(div11, t41);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div11, null);
    				}
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler_17*/ ctx[71], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_18*/ ctx[72], false, false, false, false),
    					listen_dev(div15, "click", click_handler_20, false, false, false, false),
    					listen_dev(div16, "click", /*click_handler_21*/ ctx[77], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedItem*/ 2048 && t0_value !== (t0_value = /*selectedItem*/ ctx[11].name + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*selectedItem*/ 2048 && !src_url_equal(img.src, img_src_value = /*selectedItem*/ ctx[11].image.replace("/50", "/200"))) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*selectedItem*/ 2048 && img_alt_value !== (img_alt_value = /*selectedItem*/ ctx[11].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty[0] & /*selectedItem*/ 2048 && t15_value !== (t15_value = /*selectedItem*/ ctx[11].category + "")) set_data_dev(t15, t15_value);
    			if (dirty[0] & /*selectedItem*/ 2048 && t19_value !== (t19_value = /*selectedItem*/ ctx[11].location + "")) set_data_dev(t19, t19_value);
    			if (dirty[0] & /*selectedItem*/ 2048 && t23_value !== (t23_value = /*selectedItem*/ ctx[11].quantity + "")) set_data_dev(t23, t23_value);
    			if (dirty[0] & /*selectedItem*/ 2048 && t27_value !== (t27_value = new Date(/*selectedItem*/ ctx[11].expiry).toLocaleDateString() + "")) set_data_dev(t27, t27_value);

    			if (current_block_type === (current_block_type = select_block_type_3(ctx, dirty)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(p7, null);
    				}
    			}

    			if (dirty[0] & /*selectedItem*/ 2048 && p7_class_value !== (p7_class_value = "info-value " + getExpiryStatusClass(/*selectedItem*/ ctx[11].expiry) + " svelte-ph2e9d")) {
    				attr_dev(p7, "class", p7_class_value);
    			}

    			if (/*selectedItem*/ ctx[11].brand) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_14(ctx);
    					if_block1.c();
    					if_block1.m(div7, t30);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*selectedItem*/ ctx[11].price) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_13(ctx);
    					if_block2.c();
    					if_block2.m(div7, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty[0] & /*selectedItem*/ 2048 && div8_class_value !== (div8_class_value = "progress-bar " + (/*selectedItem*/ ctx[11].percentRemaining <= 20
    			? 'low'
    			: /*selectedItem*/ ctx[11].percentRemaining <= 50
    				? 'medium'
    				: 'high') + " svelte-ph2e9d")) {
    				attr_dev(div8, "class", div8_class_value);
    			}

    			if (dirty[0] & /*selectedItem*/ 2048) {
    				set_style(div8, "width", /*selectedItem*/ ctx[11].percentRemaining + "%");
    			}

    			if (dirty[0] & /*selectedItem*/ 2048 && t35_value !== (t35_value = /*selectedItem*/ ctx[11].percentRemaining + "")) set_data_dev(t35, t35_value);
    			if (dirty[0] & /*selectedItem*/ 2048 && t37_value !== (t37_value = /*selectedItem*/ ctx[11].quantity + "")) set_data_dev(t37, t37_value);

    			if (dirty[0] & /*toggleDetailModal, filteredRecipes, selectedItem*/ 1077938176 | dirty[1] & /*toggleRecipeDetail*/ 1) {
    				each_value_6 = /*filteredRecipes*/ ctx[22].filter(/*func_4*/ ctx[75]);
    				validate_each_argument(each_value_6);
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_6(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div11, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_6.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div16);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(1447:1) {#if isDetailModalOpen && selectedItem}",
    		ctx
    	});

    	return block;
    }

    // (1524:10) {:else}
    function create_else_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "(Expired!)";
    			attr_dev(span, "class", "svelte-ph2e9d");
    			add_location(span, file, 1524, 11, 36958);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(1524:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1518:10) {#if calculateDaysUntilExpiry(selectedItem.expiry) > 0}
    function create_if_block_15(ctx) {
    	let span;
    	let t0;
    	let t1_value = calculateDaysUntilExpiry(/*selectedItem*/ ctx[11].expiry) + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("(");
    			t1 = text(t1_value);
    			t2 = text(" days left)");
    			attr_dev(span, "class", "svelte-ph2e9d");
    			add_location(span, file, 1518, 11, 36803);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedItem*/ 2048 && t1_value !== (t1_value = calculateDaysUntilExpiry(/*selectedItem*/ ctx[11].expiry) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15.name,
    		type: "if",
    		source: "(1518:10) {#if calculateDaysUntilExpiry(selectedItem.expiry) > 0}",
    		ctx
    	});

    	return block;
    }

    // (1529:8) {#if selectedItem.brand}
    function create_if_block_14(ctx) {
    	let div;
    	let p;
    	let t1;
    	let input;
    	let input_value_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "Brand";
    			t1 = space();
    			input = element("input");
    			attr_dev(p, "class", "info-label svelte-ph2e9d");
    			add_location(p, file, 1530, 10, 37102);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "info-value editable svelte-ph2e9d");
    			input.value = input_value_value = /*selectedItem*/ ctx[11].brand || "";
    			attr_dev(input, "placeholder", "Add brand name");
    			add_location(input, file, 1531, 10, 37144);
    			attr_dev(div, "class", "info-box svelte-ph2e9d");
    			add_location(div, file, 1529, 9, 37069);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(div, t1);
    			append_dev(div, input);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_handler_1*/ ctx[73], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedItem*/ 2048 && input_value_value !== (input_value_value = /*selectedItem*/ ctx[11].brand || "") && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
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
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(1529:8) {#if selectedItem.brand}",
    		ctx
    	});

    	return block;
    }

    // (1545:8) {#if selectedItem.price}
    function create_if_block_13(ctx) {
    	let div1;
    	let p;
    	let t1;
    	let div0;
    	let span;
    	let t3;
    	let input;
    	let input_value_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			p = element("p");
    			p.textContent = "Price";
    			t1 = space();
    			div0 = element("div");
    			span = element("span");
    			span.textContent = "$";
    			t3 = space();
    			input = element("input");
    			attr_dev(p, "class", "info-label svelte-ph2e9d");
    			add_location(p, file, 1546, 10, 37566);
    			attr_dev(span, "class", "currency-symbol svelte-ph2e9d");
    			add_location(span, file, 1548, 11, 37644);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "class", "info-value editable svelte-ph2e9d");
    			input.value = input_value_value = /*selectedItem*/ ctx[11].price || "";
    			attr_dev(input, "placeholder", "0.00");
    			attr_dev(input, "min", "0");
    			attr_dev(input, "step", "0.01");
    			add_location(input, file, 1551, 11, 37719);
    			attr_dev(div0, "class", "price-edit svelte-ph2e9d");
    			add_location(div0, file, 1547, 10, 37608);
    			attr_dev(div1, "class", "info-box svelte-ph2e9d");
    			add_location(div1, file, 1545, 9, 37533);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, p);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    			append_dev(div0, t3);
    			append_dev(div0, input);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_handler_2*/ ctx[74], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedItem*/ 2048 && input_value_value !== (input_value_value = /*selectedItem*/ ctx[11].price || "") && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(1545:8) {#if selectedItem.price}",
    		ctx
    	});

    	return block;
    }

    // (1595:8) {#each filteredRecipes.filter( (recipe) => recipe.ingredients.some((ing) => ing.name === selectedItem.name), ) as recipe}
    function create_each_block_6(ctx) {
    	let div1;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let div0;
    	let h5;
    	let t1_value = /*recipe*/ ctx[111].name + "";
    	let t1;
    	let t2;
    	let p;
    	let t3_value = /*recipe*/ ctx[111].cookTime + "";
    	let t3;
    	let t4;
    	let t5_value = /*recipe*/ ctx[111].difficulty + "";
    	let t5;
    	let t6;
    	let i;
    	let t7;
    	let mounted;
    	let dispose;

    	function click_handler_19() {
    		return /*click_handler_19*/ ctx[76](/*recipe*/ ctx[111]);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			h5 = element("h5");
    			t1 = text(t1_value);
    			t2 = space();
    			p = element("p");
    			t3 = text(t3_value);
    			t4 = text(" • ");
    			t5 = text(t5_value);
    			t6 = space();
    			i = element("i");
    			t7 = space();
    			if (!src_url_equal(img.src, img_src_value = /*recipe*/ ctx[111].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*recipe*/ ctx[111].name);
    			attr_dev(img, "class", "svelte-ph2e9d");
    			add_location(img, file, 1602, 10, 39143);
    			attr_dev(h5, "class", "svelte-ph2e9d");
    			add_location(h5, file, 1607, 11, 39275);
    			attr_dev(p, "class", "svelte-ph2e9d");
    			add_location(p, file, 1608, 11, 39309);
    			attr_dev(div0, "class", "related-recipe-info svelte-ph2e9d");
    			add_location(div0, file, 1606, 10, 39230);
    			attr_dev(i, "class", "fas fa-chevron-right");
    			add_location(i, file, 1612, 10, 39408);
    			attr_dev(div1, "class", "related-recipe svelte-ph2e9d");
    			add_location(div1, file, 1595, 9, 38972);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, h5);
    			append_dev(h5, t1);
    			append_dev(div0, t2);
    			append_dev(div0, p);
    			append_dev(p, t3);
    			append_dev(p, t4);
    			append_dev(p, t5);
    			append_dev(div1, t6);
    			append_dev(div1, i);
    			append_dev(div1, t7);

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", click_handler_19, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*filteredRecipes, selectedItem*/ 4196352 && !src_url_equal(img.src, img_src_value = /*recipe*/ ctx[111].image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*filteredRecipes, selectedItem*/ 4196352 && img_alt_value !== (img_alt_value = /*recipe*/ ctx[111].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty[0] & /*filteredRecipes, selectedItem*/ 4196352 && t1_value !== (t1_value = /*recipe*/ ctx[111].name + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*filteredRecipes, selectedItem*/ 4196352 && t3_value !== (t3_value = /*recipe*/ ctx[111].cookTime + "")) set_data_dev(t3, t3_value);
    			if (dirty[0] & /*filteredRecipes, selectedItem*/ 4196352 && t5_value !== (t5_value = /*recipe*/ ctx[111].difficulty + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(1595:8) {#each filteredRecipes.filter( (recipe) => recipe.ingredients.some((ing) => ing.name === selectedItem.name), ) as recipe}",
    		ctx
    	});

    	return block;
    }

    // (1625:1) {#if isRecipeDetailOpen && selectedRecipe}
    function create_if_block_6(ctx) {
    	let div11;
    	let div10;
    	let div0;
    	let h3;
    	let t0_value = /*selectedRecipe*/ ctx[12].name + "";
    	let t0;
    	let t1;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t2;
    	let button0;
    	let i0;
    	let t3;
    	let div1;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let div9;
    	let div8;
    	let div4;
    	let div2;
    	let h40;
    	let t9;
    	let ul0;
    	let t10;
    	let div3;
    	let h41;
    	let t12;
    	let ul1;
    	let t13;
    	let button1;
    	let i1;
    	let t14;
    	let t15;
    	let div7;
    	let div5;
    	let h42;
    	let t17;
    	let ol;
    	let t18;
    	let div6;
    	let h43;
    	let t20;
    	let ul2;
    	let li0;
    	let t22;
    	let li1;
    	let t24;
    	let li2;
    	let t26;
    	let button2;
    	let i2;
    	let t27;
    	let mounted;
    	let dispose;
    	let if_block0 = /*selectedRecipe*/ ctx[12].cookTime && create_if_block_11(ctx);
    	let if_block1 = /*selectedRecipe*/ ctx[12].difficulty && create_if_block_10(ctx);
    	let if_block2 = /*selectedRecipe*/ ctx[12].calories && create_if_block_9(ctx);
    	let if_block3 = /*selectedRecipe*/ ctx[12].servings && create_if_block_8(ctx);
    	let each_value_5 = /*selectedRecipe*/ ctx[12].ingredients;
    	validate_each_argument(each_value_5);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks_2[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	let each_value_4 = /*selectedRecipe*/ ctx[12].ingredients;
    	validate_each_argument(each_value_4);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_1[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = /*selectedRecipe*/ ctx[12].instructions;
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			div10 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			button0 = element("button");
    			i0 = element("i");
    			t3 = space();
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t4 = space();
    			if (if_block1) if_block1.c();
    			t5 = space();
    			if (if_block2) if_block2.c();
    			t6 = space();
    			if (if_block3) if_block3.c();
    			t7 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			h40 = element("h4");
    			h40.textContent = "Ingredients";
    			t9 = space();
    			ul0 = element("ul");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t10 = space();
    			div3 = element("div");
    			h41 = element("h4");
    			h41.textContent = "What You Have";
    			t12 = space();
    			ul1 = element("ul");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t13 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t14 = text(" Add Missing\n\t\t\t\t\t\t\t\t\tto Shopping List");
    			t15 = space();
    			div7 = element("div");
    			div5 = element("div");
    			h42 = element("h4");
    			h42.textContent = "Instructions";
    			t17 = space();
    			ol = element("ol");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t18 = space();
    			div6 = element("div");
    			h43 = element("h4");
    			h43.textContent = "Tips";
    			t20 = space();
    			ul2 = element("ul");
    			li0 = element("li");
    			li0.textContent = "For best results, use fresh ingredients\n\t\t\t\t\t\t\t\t\t\twhenever possible.";
    			t22 = space();
    			li1 = element("li");
    			li1.textContent = "You can substitute spinach with kale if\n\t\t\t\t\t\t\t\t\t\tneeded.";
    			t24 = space();
    			li2 = element("li");
    			li2.textContent = "Store leftovers in an airtight container\n\t\t\t\t\t\t\t\t\t\tfor up to 3 days in the refrigerator.";
    			t26 = space();
    			button2 = element("button");
    			i2 = element("i");
    			t27 = text(" Start Cooking");
    			attr_dev(h3, "class", "svelte-ph2e9d");
    			add_location(h3, file, 1631, 5, 39832);
    			if (!src_url_equal(img.src, img_src_value = /*selectedRecipe*/ ctx[12].image.replace("/150", "/150"))) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*selectedRecipe*/ ctx[12].name);
    			attr_dev(img, "class", "recipe-header-image svelte-ph2e9d");
    			add_location(img, file, 1633, 5, 39869);
    			attr_dev(i0, "class", "fas fa-times");
    			add_location(i0, file, 1643, 6, 40103);
    			attr_dev(button0, "class", "close-button svelte-ph2e9d");
    			add_location(button0, file, 1639, 5, 40011);
    			attr_dev(div0, "class", "modal-header recipe-header svelte-ph2e9d");
    			add_location(div0, file, 1630, 4, 39786);
    			attr_dev(div1, "class", "recipe-badges-container svelte-ph2e9d");
    			add_location(div1, file, 1647, 4, 40163);
    			attr_dev(h40, "class", "svelte-ph2e9d");
    			add_location(h40, file, 1681, 8, 41124);
    			attr_dev(ul0, "class", "svelte-ph2e9d");
    			add_location(ul0, file, 1682, 8, 41153);
    			attr_dev(div2, "class", "ingredients-list svelte-ph2e9d");
    			add_location(div2, file, 1680, 7, 41085);
    			attr_dev(h41, "class", "svelte-ph2e9d");
    			add_location(h41, file, 1708, 8, 41813);
    			attr_dev(ul1, "class", "svelte-ph2e9d");
    			add_location(ul1, file, 1709, 8, 41844);
    			attr_dev(i1, "class", "fas fa-shopping-cart");
    			add_location(i1, file, 1728, 9, 42374);
    			attr_dev(button1, "class", "secondary-button full-width svelte-ph2e9d");
    			add_location(button1, file, 1727, 8, 42320);
    			attr_dev(div3, "class", "ingredient-availability svelte-ph2e9d");
    			add_location(div3, file, 1707, 7, 41767);
    			attr_dev(div4, "class", "recipe-ingredients-column svelte-ph2e9d");
    			add_location(div4, file, 1679, 6, 41038);
    			attr_dev(h42, "class", "svelte-ph2e9d");
    			add_location(h42, file, 1736, 8, 42584);
    			attr_dev(ol, "class", "svelte-ph2e9d");
    			add_location(ol, file, 1737, 8, 42614);
    			attr_dev(div5, "class", "instructions svelte-ph2e9d");
    			add_location(div5, file, 1735, 7, 42549);
    			attr_dev(h43, "class", "svelte-ph2e9d");
    			add_location(h43, file, 1751, 8, 42939);
    			attr_dev(li0, "class", "svelte-ph2e9d");
    			add_location(li0, file, 1753, 9, 42975);
    			attr_dev(li1, "class", "svelte-ph2e9d");
    			add_location(li1, file, 1757, 9, 43083);
    			attr_dev(li2, "class", "svelte-ph2e9d");
    			add_location(li2, file, 1761, 9, 43180);
    			attr_dev(ul2, "class", "svelte-ph2e9d");
    			add_location(ul2, file, 1752, 8, 42961);
    			attr_dev(div6, "class", "recipe-tips svelte-ph2e9d");
    			add_location(div6, file, 1750, 7, 42905);
    			attr_dev(i2, "class", "fas fa-utensils");
    			add_location(i2, file, 1769, 8, 43387);
    			attr_dev(button2, "class", "primary-button cook-button svelte-ph2e9d");
    			add_location(button2, file, 1768, 7, 43335);
    			attr_dev(div7, "class", "recipe-instructions-column svelte-ph2e9d");
    			add_location(div7, file, 1734, 6, 42501);
    			attr_dev(div8, "class", "recipe-columns svelte-ph2e9d");
    			add_location(div8, file, 1678, 5, 41003);
    			attr_dev(div9, "class", "modal-content recipe-detail svelte-ph2e9d");
    			add_location(div9, file, 1677, 4, 40956);
    			attr_dev(div10, "class", "modal recipe-modal svelte-ph2e9d");
    			add_location(div10, file, 1626, 3, 39699);
    			attr_dev(div11, "class", "modal-overlay svelte-ph2e9d");
    			add_location(div11, file, 1625, 2, 39630);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div10);
    			append_dev(div10, div0);
    			append_dev(div0, h3);
    			append_dev(h3, t0);
    			append_dev(div0, t1);
    			append_dev(div0, img);
    			append_dev(div0, t2);
    			append_dev(div0, button0);
    			append_dev(button0, i0);
    			append_dev(div10, t3);
    			append_dev(div10, div1);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t4);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t5);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(div1, t6);
    			if (if_block3) if_block3.m(div1, null);
    			append_dev(div10, t7);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div4);
    			append_dev(div4, div2);
    			append_dev(div2, h40);
    			append_dev(div2, t9);
    			append_dev(div2, ul0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(ul0, null);
    				}
    			}

    			append_dev(div4, t10);
    			append_dev(div4, div3);
    			append_dev(div3, h41);
    			append_dev(div3, t12);
    			append_dev(div3, ul1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(ul1, null);
    				}
    			}

    			append_dev(div3, t13);
    			append_dev(div3, button1);
    			append_dev(button1, i1);
    			append_dev(button1, t14);
    			append_dev(div8, t15);
    			append_dev(div8, div7);
    			append_dev(div7, div5);
    			append_dev(div5, h42);
    			append_dev(div5, t17);
    			append_dev(div5, ol);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(ol, null);
    				}
    			}

    			append_dev(div7, t18);
    			append_dev(div7, div6);
    			append_dev(div6, h43);
    			append_dev(div6, t20);
    			append_dev(div6, ul2);
    			append_dev(ul2, li0);
    			append_dev(ul2, t22);
    			append_dev(ul2, li1);
    			append_dev(ul2, t24);
    			append_dev(ul2, li2);
    			append_dev(div7, t26);
    			append_dev(div7, button2);
    			append_dev(button2, i2);
    			append_dev(button2, t27);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler_22*/ ctx[78], false, false, false, false),
    					listen_dev(div10, "click", click_handler_23, false, false, false, false),
    					listen_dev(div11, "click", /*click_handler_24*/ ctx[79], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedRecipe*/ 4096 && t0_value !== (t0_value = /*selectedRecipe*/ ctx[12].name + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*selectedRecipe*/ 4096 && !src_url_equal(img.src, img_src_value = /*selectedRecipe*/ ctx[12].image.replace("/150", "/150"))) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*selectedRecipe*/ 4096 && img_alt_value !== (img_alt_value = /*selectedRecipe*/ ctx[12].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (/*selectedRecipe*/ ctx[12].cookTime) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_11(ctx);
    					if_block0.c();
    					if_block0.m(div1, t4);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*selectedRecipe*/ ctx[12].difficulty) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_10(ctx);
    					if_block1.c();
    					if_block1.m(div1, t5);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*selectedRecipe*/ ctx[12].calories) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_9(ctx);
    					if_block2.c();
    					if_block2.m(div1, t6);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*selectedRecipe*/ ctx[12].servings) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_8(ctx);
    					if_block3.c();
    					if_block3.m(div1, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty[0] & /*selectedRecipe*/ 4096) {
    				each_value_5 = /*selectedRecipe*/ ctx[12].ingredients;
    				validate_each_argument(each_value_5);
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_5(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(ul0, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_5.length;
    			}

    			if (dirty[0] & /*selectedRecipe*/ 4096) {
    				each_value_4 = /*selectedRecipe*/ ctx[12].ingredients;
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_4(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(ul1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_4.length;
    			}

    			if (dirty[0] & /*selectedRecipe*/ 4096) {
    				each_value_3 = /*selectedRecipe*/ ctx[12].instructions;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ol, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(1625:1) {#if isRecipeDetailOpen && selectedRecipe}",
    		ctx
    	});

    	return block;
    }

    // (1649:5) {#if selectedRecipe.cookTime}
    function create_if_block_11(ctx) {
    	let span;
    	let i;
    	let t0;
    	let t1_value = /*selectedRecipe*/ ctx[12].cookTime + "";
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(i, "class", "far fa-clock svelte-ph2e9d");
    			add_location(i, file, 1650, 7, 40277);
    			attr_dev(span, "class", "recipe-badge svelte-ph2e9d");
    			add_location(span, file, 1649, 6, 40242);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedRecipe*/ 4096 && t1_value !== (t1_value = /*selectedRecipe*/ ctx[12].cookTime + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(1649:5) {#if selectedRecipe.cookTime}",
    		ctx
    	});

    	return block;
    }

    // (1655:5) {#if selectedRecipe.difficulty}
    function create_if_block_10(ctx) {
    	let span;
    	let i;
    	let t0;
    	let t1_value = /*selectedRecipe*/ ctx[12].difficulty + "";
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(i, "class", "fas fa-utensils svelte-ph2e9d");
    			add_location(i, file, 1656, 7, 40442);
    			attr_dev(span, "class", "recipe-badge svelte-ph2e9d");
    			add_location(span, file, 1655, 6, 40407);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedRecipe*/ 4096 && t1_value !== (t1_value = /*selectedRecipe*/ ctx[12].difficulty + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(1655:5) {#if selectedRecipe.difficulty}",
    		ctx
    	});

    	return block;
    }

    // (1661:5) {#if selectedRecipe.calories}
    function create_if_block_9(ctx) {
    	let span;
    	let i;
    	let t0;
    	let t1_value = /*selectedRecipe*/ ctx[12].calories + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = text(" cal");
    			attr_dev(i, "class", "fas fa-fire svelte-ph2e9d");
    			add_location(i, file, 1662, 7, 40610);
    			attr_dev(span, "class", "recipe-badge svelte-ph2e9d");
    			add_location(span, file, 1661, 6, 40575);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedRecipe*/ 4096 && t1_value !== (t1_value = /*selectedRecipe*/ ctx[12].calories + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(1661:5) {#if selectedRecipe.calories}",
    		ctx
    	});

    	return block;
    }

    // (1667:5) {#if selectedRecipe.servings}
    function create_if_block_8(ctx) {
    	let span;
    	let i;
    	let t0;
    	let t1_value = /*selectedRecipe*/ ctx[12].servings + "";
    	let t1;
    	let t2;

    	let t3_value = (/*selectedRecipe*/ ctx[12].servings > 1
    	? "servings"
    	: "serving") + "";

    	let t3;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			t3 = text(t3_value);
    			attr_dev(i, "class", "fas fa-user svelte-ph2e9d");
    			add_location(i, file, 1668, 7, 40776);
    			attr_dev(span, "class", "recipe-badge svelte-ph2e9d");
    			add_location(span, file, 1667, 6, 40741);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(span, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedRecipe*/ 4096 && t1_value !== (t1_value = /*selectedRecipe*/ ctx[12].servings + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*selectedRecipe*/ 4096 && t3_value !== (t3_value = (/*selectedRecipe*/ ctx[12].servings > 1
    			? "servings"
    			: "serving") + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(1667:5) {#if selectedRecipe.servings}",
    		ctx
    	});

    	return block;
    }

    // (1684:9) {#each selectedRecipe.ingredients as ingredient}
    function create_each_block_5(ctx) {
    	let li;
    	let div;
    	let input;
    	let input_id_value;
    	let t0;
    	let label;
    	let t1_value = /*ingredient*/ ctx[106].name + "";
    	let t1;
    	let label_for_value;
    	let t2;
    	let span;
    	let t3_value = /*ingredient*/ ctx[106].amount + "";
    	let t3;
    	let t4;
    	let li_class_value;

    	const block = {
    		c: function create() {
    			li = element("li");
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			t1 = text(t1_value);
    			t2 = space();
    			span = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", input_id_value = "ing-" + /*ingredient*/ ctx[106].name);
    			add_location(input, file, 1690, 12, 41381);
    			attr_dev(label, "for", label_for_value = "ing-" + /*ingredient*/ ctx[106].name);
    			add_location(label, file, 1694, 12, 41484);
    			attr_dev(div, "class", "ingredient-check svelte-ph2e9d");
    			add_location(div, file, 1689, 11, 41338);
    			attr_dev(span, "class", "ingredient-amount svelte-ph2e9d");
    			add_location(span, file, 1699, 11, 41614);
    			attr_dev(li, "class", li_class_value = "" + (null_to_empty(/*ingredient*/ ctx[106].inInventory ? "available" : "") + " svelte-ph2e9d"));
    			add_location(li, file, 1684, 10, 41226);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, div);
    			append_dev(div, input);
    			append_dev(div, t0);
    			append_dev(div, label);
    			append_dev(label, t1);
    			append_dev(li, t2);
    			append_dev(li, span);
    			append_dev(span, t3);
    			append_dev(li, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedRecipe*/ 4096 && input_id_value !== (input_id_value = "ing-" + /*ingredient*/ ctx[106].name)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty[0] & /*selectedRecipe*/ 4096 && t1_value !== (t1_value = /*ingredient*/ ctx[106].name + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*selectedRecipe*/ 4096 && label_for_value !== (label_for_value = "ing-" + /*ingredient*/ ctx[106].name)) {
    				attr_dev(label, "for", label_for_value);
    			}

    			if (dirty[0] & /*selectedRecipe*/ 4096 && t3_value !== (t3_value = /*ingredient*/ ctx[106].amount + "")) set_data_dev(t3, t3_value);

    			if (dirty[0] & /*selectedRecipe*/ 4096 && li_class_value !== (li_class_value = "" + (null_to_empty(/*ingredient*/ ctx[106].inInventory ? "available" : "") + " svelte-ph2e9d"))) {
    				attr_dev(li, "class", li_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(1684:9) {#each selectedRecipe.ingredients as ingredient}",
    		ctx
    	});

    	return block;
    }

    // (1719:11) {:else}
    function create_else_block(ctx) {
    	let span;
    	let i;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			t = text("\n\t\t\t\t\t\t\t\t\t\t\t\t\tMissing");
    			attr_dev(i, "class", "fas fa-times");
    			add_location(i, file, 1720, 13, 42178);
    			attr_dev(span, "class", "missing svelte-ph2e9d");
    			add_location(span, file, 1719, 12, 42142);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(1719:11) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1714:11) {#if ingredient.inInventory}
    function create_if_block_7(ctx) {
    	let span;
    	let i;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			t = text("\n\t\t\t\t\t\t\t\t\t\t\t\t\tIn stock");
    			attr_dev(i, "class", "fas fa-check");
    			add_location(i, file, 1715, 13, 42040);
    			attr_dev(span, "class", "in-stock svelte-ph2e9d");
    			add_location(span, file, 1714, 12, 42003);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(1714:11) {#if ingredient.inInventory}",
    		ctx
    	});

    	return block;
    }

    // (1711:9) {#each selectedRecipe.ingredients as ingredient}
    function create_each_block_4(ctx) {
    	let li;
    	let t0_value = /*ingredient*/ ctx[106].name + "";
    	let t0;
    	let t1;
    	let t2;

    	function select_block_type_4(ctx, dirty) {
    		if (/*ingredient*/ ctx[106].inInventory) return create_if_block_7;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_4(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = space();
    			if_block.c();
    			t2 = space();
    			attr_dev(li, "class", "svelte-ph2e9d");
    			add_location(li, file, 1711, 10, 41917);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			if_block.m(li, null);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedRecipe*/ 4096 && t0_value !== (t0_value = /*ingredient*/ ctx[106].name + "")) set_data_dev(t0, t0_value);

    			if (current_block_type !== (current_block_type = select_block_type_4(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(li, t2);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(1711:9) {#each selectedRecipe.ingredients as ingredient}",
    		ctx
    	});

    	return block;
    }

    // (1739:9) {#each selectedRecipe.instructions as step, index}
    function create_each_block_3(ctx) {
    	let li;
    	let span0;
    	let t0_value = /*index*/ ctx[105] + 1 + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = /*step*/ ctx[103] + "";
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			li = element("li");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			attr_dev(span0, "class", "step-number svelte-ph2e9d");
    			add_location(span0, file, 1740, 11, 42705);
    			attr_dev(span1, "class", "step-text");
    			add_location(span1, file, 1743, 11, 42786);
    			attr_dev(li, "class", "svelte-ph2e9d");
    			add_location(li, file, 1739, 10, 42689);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, span0);
    			append_dev(span0, t0);
    			append_dev(li, t1);
    			append_dev(li, span1);
    			append_dev(span1, t2);
    			append_dev(li, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedRecipe*/ 4096 && t2_value !== (t2_value = /*step*/ ctx[103] + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(1739:9) {#each selectedRecipe.instructions as step, index}",
    		ctx
    	});

    	return block;
    }

    // (1780:1) {#if isAddItemModalOpen}
    function create_if_block_1(ctx) {
    	let div14;
    	let div13;
    	let div0;
    	let h3;
    	let t1;
    	let button0;
    	let i0;
    	let t2;
    	let div12;
    	let form;
    	let div10;
    	let div1;
    	let label0;
    	let t3;
    	let span0;
    	let t5;
    	let input0;
    	let input0_class_value;
    	let t6;
    	let t7;
    	let div2;
    	let label1;
    	let t9;
    	let select0;
    	let t10;
    	let div4;
    	let label2;
    	let t11;
    	let span1;
    	let t13;
    	let div3;
    	let input1;
    	let input1_class_value;
    	let t14;
    	let select1;
    	let t15;
    	let t16;
    	let div5;
    	let label3;
    	let t18;
    	let select2;
    	let t19;
    	let div6;
    	let label4;
    	let t21;
    	let input2;
    	let t22;
    	let div7;
    	let label5;
    	let t24;
    	let input3;
    	let input3_class_value;
    	let t25;
    	let t26;
    	let div9;
    	let label6;
    	let t27;
    	let span2;
    	let t29;
    	let div8;
    	let input4;
    	let input4_class_value;
    	let t30;
    	let button1;
    	let i1;
    	let t31;
    	let t32;
    	let div11;
    	let button2;
    	let t34;
    	let button3;
    	let mounted;
    	let dispose;
    	let if_block0 = /*formErrors*/ ctx[17].name && create_if_block_5(ctx);
    	let each_value_2 = /*categories*/ ctx[23];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*quantityTypes*/ ctx[25];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let if_block1 = /*formErrors*/ ctx[17].quantity && create_if_block_4(ctx);
    	let each_value = /*locations*/ ctx[24];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block2 = /*formErrors*/ ctx[17].price && create_if_block_3(ctx);
    	let if_block3 = /*formErrors*/ ctx[17].expiry && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			div14 = element("div");
    			div13 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Add New Item";
    			t1 = space();
    			button0 = element("button");
    			i0 = element("i");
    			t2 = space();
    			div12 = element("div");
    			form = element("form");
    			div10 = element("div");
    			div1 = element("div");
    			label0 = element("label");
    			t3 = text("Item Name ");
    			span0 = element("span");
    			span0.textContent = "*";
    			t5 = space();
    			input0 = element("input");
    			t6 = space();
    			if (if_block0) if_block0.c();
    			t7 = space();
    			div2 = element("div");
    			label1 = element("label");
    			label1.textContent = "Category";
    			t9 = space();
    			select0 = element("select");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t10 = space();
    			div4 = element("div");
    			label2 = element("label");
    			t11 = text("Quantity ");
    			span1 = element("span");
    			span1.textContent = "*";
    			t13 = space();
    			div3 = element("div");
    			input1 = element("input");
    			t14 = space();
    			select1 = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t15 = space();
    			if (if_block1) if_block1.c();
    			t16 = space();
    			div5 = element("div");
    			label3 = element("label");
    			label3.textContent = "Location";
    			t18 = space();
    			select2 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t19 = space();
    			div6 = element("div");
    			label4 = element("label");
    			label4.textContent = "Brand";
    			t21 = space();
    			input2 = element("input");
    			t22 = space();
    			div7 = element("div");
    			label5 = element("label");
    			label5.textContent = "Price ($)";
    			t24 = space();
    			input3 = element("input");
    			t25 = space();
    			if (if_block2) if_block2.c();
    			t26 = space();
    			div9 = element("div");
    			label6 = element("label");
    			t27 = text("Expiry Date ");
    			span2 = element("span");
    			span2.textContent = "*";
    			t29 = space();
    			div8 = element("div");
    			input4 = element("input");
    			t30 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t31 = space();
    			if (if_block3) if_block3.c();
    			t32 = space();
    			div11 = element("div");
    			button2 = element("button");
    			button2.textContent = "Cancel";
    			t34 = space();
    			button3 = element("button");
    			button3.textContent = "Add Item";
    			attr_dev(h3, "class", "svelte-ph2e9d");
    			add_location(h3, file, 1783, 5, 43721);
    			attr_dev(i0, "class", "fas fa-times");
    			add_location(i0, file, 1785, 6, 43814);
    			attr_dev(button0, "class", "close-button svelte-ph2e9d");
    			add_location(button0, file, 1784, 5, 43748);
    			attr_dev(div0, "class", "modal-header svelte-ph2e9d");
    			add_location(div0, file, 1782, 4, 43689);
    			attr_dev(span0, "class", "required svelte-ph2e9d");
    			add_location(span0, file, 1794, 20, 44060);
    			attr_dev(label0, "for", "name");
    			attr_dev(label0, "class", "svelte-ph2e9d");
    			add_location(label0, file, 1793, 8, 44022);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "name");
    			attr_dev(input0, "class", input0_class_value = "" + (null_to_empty(/*formErrors*/ ctx[17].name ? "error" : "") + " svelte-ph2e9d"));
    			add_location(input0, file, 1797, 8, 44127);
    			attr_dev(div1, "class", "form-group svelte-ph2e9d");
    			add_location(div1, file, 1792, 7, 43989);
    			attr_dev(label1, "for", "category");
    			attr_dev(label1, "class", "svelte-ph2e9d");
    			add_location(label1, file, 1811, 8, 44444);
    			attr_dev(select0, "id", "category");
    			attr_dev(select0, "class", "svelte-ph2e9d");
    			if (/*newItem*/ ctx[16].category === void 0) add_render_callback(() => /*select0_change_handler_1*/ ctx[81].call(select0));
    			add_location(select0, file, 1812, 8, 44491);
    			attr_dev(div2, "class", "form-group svelte-ph2e9d");
    			add_location(div2, file, 1810, 7, 44411);
    			attr_dev(span1, "class", "required svelte-ph2e9d");
    			add_location(span1, file, 1824, 19, 44780);
    			attr_dev(label2, "for", "quantity");
    			attr_dev(label2, "class", "svelte-ph2e9d");
    			add_location(label2, file, 1823, 8, 44739);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "id", "quantity-amount");
    			attr_dev(input1, "class", input1_class_value = "" + (null_to_empty(/*formErrors*/ ctx[17].quantity ? "error" : "") + " svelte-ph2e9d"));
    			attr_dev(input1, "min", "0.01");
    			attr_dev(input1, "step", "0.01");
    			attr_dev(input1, "placeholder", "Amount");
    			add_location(input1, file, 1828, 9, 44888);
    			attr_dev(select1, "id", "quantity-type");
    			attr_dev(select1, "class", "svelte-ph2e9d");
    			if (/*newItem*/ ctx[16].quantityType === void 0) add_render_callback(() => /*select1_change_handler_1*/ ctx[83].call(select1));
    			add_location(select1, file, 1839, 9, 45166);
    			attr_dev(div3, "class", "quantity-selector svelte-ph2e9d");
    			add_location(div3, file, 1827, 8, 44847);
    			attr_dev(div4, "class", "form-group svelte-ph2e9d");
    			add_location(div4, file, 1822, 7, 44706);
    			attr_dev(label3, "for", "location");
    			attr_dev(label3, "class", "svelte-ph2e9d");
    			add_location(label3, file, 1856, 8, 45569);
    			attr_dev(select2, "id", "location");
    			attr_dev(select2, "class", "svelte-ph2e9d");
    			if (/*newItem*/ ctx[16].location === void 0) add_render_callback(() => /*select2_change_handler_1*/ ctx[84].call(select2));
    			add_location(select2, file, 1857, 8, 45616);
    			attr_dev(div5, "class", "form-group svelte-ph2e9d");
    			add_location(div5, file, 1855, 7, 45536);
    			attr_dev(label4, "for", "brand");
    			attr_dev(label4, "class", "svelte-ph2e9d");
    			add_location(label4, file, 1868, 8, 45863);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "id", "brand");
    			attr_dev(input2, "placeholder", "Enter brand name");
    			attr_dev(input2, "class", "svelte-ph2e9d");
    			add_location(input2, file, 1869, 8, 45904);
    			attr_dev(div6, "class", "form-group svelte-ph2e9d");
    			add_location(div6, file, 1867, 7, 45830);
    			attr_dev(label5, "for", "price");
    			attr_dev(label5, "class", "svelte-ph2e9d");
    			add_location(label5, file, 1878, 8, 46094);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "id", "price");
    			attr_dev(input3, "class", input3_class_value = "" + (null_to_empty(/*formErrors*/ ctx[17].price ? "error" : "") + " svelte-ph2e9d"));
    			attr_dev(input3, "placeholder", "0.00");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "step", "0.01");
    			add_location(input3, file, 1879, 8, 46139);
    			attr_dev(div7, "class", "form-group svelte-ph2e9d");
    			add_location(div7, file, 1877, 7, 46061);
    			attr_dev(span2, "class", "required svelte-ph2e9d");
    			add_location(span2, file, 1897, 22, 46571);
    			attr_dev(label6, "for", "expiry");
    			attr_dev(label6, "class", "svelte-ph2e9d");
    			add_location(label6, file, 1896, 8, 46529);
    			attr_dev(input4, "type", "date");
    			attr_dev(input4, "id", "expiry");
    			attr_dev(input4, "class", input4_class_value = "" + (null_to_empty(/*formErrors*/ ctx[17].expiry ? "error" : "") + " svelte-ph2e9d"));
    			add_location(input4, file, 1901, 9, 46683);
    			attr_dev(i1, "class", "fas fa-calendar-alt");
    			add_location(i1, file, 1925, 10, 47319);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "calendar-button svelte-ph2e9d");
    			add_location(button1, file, 1907, 9, 46844);
    			attr_dev(div8, "class", "date-picker-container svelte-ph2e9d");
    			add_location(div8, file, 1900, 8, 46638);
    			attr_dev(div9, "class", "form-group svelte-ph2e9d");
    			add_location(div9, file, 1895, 7, 46496);
    			attr_dev(div10, "class", "form-grid svelte-ph2e9d");
    			add_location(div10, file, 1791, 6, 43958);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "secondary-button svelte-ph2e9d");
    			add_location(button2, file, 1937, 7, 47582);
    			attr_dev(button3, "type", "submit");
    			attr_dev(button3, "class", "primary-button svelte-ph2e9d");
    			add_location(button3, file, 1944, 7, 47731);
    			attr_dev(div11, "class", "form-actions svelte-ph2e9d");
    			add_location(div11, file, 1936, 6, 47548);
    			add_location(form, file, 1790, 5, 43907);
    			attr_dev(div12, "class", "modal-content svelte-ph2e9d");
    			add_location(div12, file, 1789, 4, 43874);
    			attr_dev(div13, "class", "modal svelte-ph2e9d");
    			add_location(div13, file, 1781, 3, 43627);
    			attr_dev(div14, "class", "modal-overlay svelte-ph2e9d");
    			add_location(div14, file, 1780, 2, 43566);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div13);
    			append_dev(div13, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, i0);
    			append_dev(div13, t2);
    			append_dev(div13, div12);
    			append_dev(div12, form);
    			append_dev(form, div10);
    			append_dev(div10, div1);
    			append_dev(div1, label0);
    			append_dev(label0, t3);
    			append_dev(label0, span0);
    			append_dev(div1, t5);
    			append_dev(div1, input0);
    			set_input_value(input0, /*newItem*/ ctx[16].name);
    			append_dev(div1, t6);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div10, t7);
    			append_dev(div10, div2);
    			append_dev(div2, label1);
    			append_dev(div2, t9);
    			append_dev(div2, select0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(select0, null);
    				}
    			}

    			select_option(select0, /*newItem*/ ctx[16].category, true);
    			append_dev(div10, t10);
    			append_dev(div10, div4);
    			append_dev(div4, label2);
    			append_dev(label2, t11);
    			append_dev(label2, span1);
    			append_dev(div4, t13);
    			append_dev(div4, div3);
    			append_dev(div3, input1);
    			set_input_value(input1, /*newItem*/ ctx[16].quantityAmount);
    			append_dev(div3, t14);
    			append_dev(div3, select1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*newItem*/ ctx[16].quantityType, true);
    			append_dev(div4, t15);
    			if (if_block1) if_block1.m(div4, null);
    			append_dev(div10, t16);
    			append_dev(div10, div5);
    			append_dev(div5, label3);
    			append_dev(div5, t18);
    			append_dev(div5, select2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select2, null);
    				}
    			}

    			select_option(select2, /*newItem*/ ctx[16].location, true);
    			append_dev(div10, t19);
    			append_dev(div10, div6);
    			append_dev(div6, label4);
    			append_dev(div6, t21);
    			append_dev(div6, input2);
    			set_input_value(input2, /*newItem*/ ctx[16].brand);
    			append_dev(div10, t22);
    			append_dev(div10, div7);
    			append_dev(div7, label5);
    			append_dev(div7, t24);
    			append_dev(div7, input3);
    			set_input_value(input3, /*newItem*/ ctx[16].price);
    			append_dev(div7, t25);
    			if (if_block2) if_block2.m(div7, null);
    			append_dev(div10, t26);
    			append_dev(div10, div9);
    			append_dev(div9, label6);
    			append_dev(label6, t27);
    			append_dev(label6, span2);
    			append_dev(div9, t29);
    			append_dev(div9, div8);
    			append_dev(div8, input4);
    			set_input_value(input4, /*newItem*/ ctx[16].expiry);
    			append_dev(div8, t30);
    			append_dev(div8, button1);
    			append_dev(button1, i1);
    			append_dev(div9, t31);
    			if (if_block3) if_block3.m(div9, null);
    			append_dev(form, t32);
    			append_dev(form, div11);
    			append_dev(div11, button2);
    			append_dev(div11, t34);
    			append_dev(div11, button3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*toggleAddItemModal*/ ctx[29], false, false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[80]),
    					listen_dev(select0, "change", /*select0_change_handler_1*/ ctx[81]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[82]),
    					listen_dev(select1, "change", /*select1_change_handler_1*/ ctx[83]),
    					listen_dev(select2, "change", /*select2_change_handler_1*/ ctx[84]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[85]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[86]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[87]),
    					listen_dev(button1, "click", /*click_handler_25*/ ctx[88], false, false, false, false),
    					listen_dev(button2, "click", /*toggleAddItemModal*/ ctx[29], false, false, false, false),
    					listen_dev(form, "submit", prevent_default(/*addNewItem*/ ctx[33]), false, true, false, false),
    					listen_dev(div13, "click", click_handler_26, false, false, false, false),
    					listen_dev(div14, "click", /*toggleAddItemModal*/ ctx[29], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*formErrors*/ 131072 && input0_class_value !== (input0_class_value = "" + (null_to_empty(/*formErrors*/ ctx[17].name ? "error" : "") + " svelte-ph2e9d"))) {
    				attr_dev(input0, "class", input0_class_value);
    			}

    			if (dirty[0] & /*newItem, categories*/ 8454144 && input0.value !== /*newItem*/ ctx[16].name) {
    				set_input_value(input0, /*newItem*/ ctx[16].name);
    			}

    			if (/*formErrors*/ ctx[17].name) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					if_block0.m(div1, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*categories*/ 8388608) {
    				each_value_2 = /*categories*/ ctx[23];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty[0] & /*newItem, categories*/ 8454144) {
    				select_option(select0, /*newItem*/ ctx[16].category);
    			}

    			if (dirty[0] & /*formErrors*/ 131072 && input1_class_value !== (input1_class_value = "" + (null_to_empty(/*formErrors*/ ctx[17].quantity ? "error" : "") + " svelte-ph2e9d"))) {
    				attr_dev(input1, "class", input1_class_value);
    			}

    			if (dirty[0] & /*newItem, categories*/ 8454144 && to_number(input1.value) !== /*newItem*/ ctx[16].quantityAmount) {
    				set_input_value(input1, /*newItem*/ ctx[16].quantityAmount);
    			}

    			if (dirty[0] & /*quantityTypes*/ 33554432) {
    				each_value_1 = /*quantityTypes*/ ctx[25];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*newItem, categories*/ 8454144) {
    				select_option(select1, /*newItem*/ ctx[16].quantityType);
    			}

    			if (/*formErrors*/ ctx[17].quantity) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_4(ctx);
    					if_block1.c();
    					if_block1.m(div4, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*locations*/ 16777216) {
    				each_value = /*locations*/ ctx[24];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*newItem, categories*/ 8454144) {
    				select_option(select2, /*newItem*/ ctx[16].location);
    			}

    			if (dirty[0] & /*newItem, categories*/ 8454144 && input2.value !== /*newItem*/ ctx[16].brand) {
    				set_input_value(input2, /*newItem*/ ctx[16].brand);
    			}

    			if (dirty[0] & /*formErrors*/ 131072 && input3_class_value !== (input3_class_value = "" + (null_to_empty(/*formErrors*/ ctx[17].price ? "error" : "") + " svelte-ph2e9d"))) {
    				attr_dev(input3, "class", input3_class_value);
    			}

    			if (dirty[0] & /*newItem, categories*/ 8454144 && to_number(input3.value) !== /*newItem*/ ctx[16].price) {
    				set_input_value(input3, /*newItem*/ ctx[16].price);
    			}

    			if (/*formErrors*/ ctx[17].price) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_3(ctx);
    					if_block2.c();
    					if_block2.m(div7, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty[0] & /*formErrors*/ 131072 && input4_class_value !== (input4_class_value = "" + (null_to_empty(/*formErrors*/ ctx[17].expiry ? "error" : "") + " svelte-ph2e9d"))) {
    				attr_dev(input4, "class", input4_class_value);
    			}

    			if (dirty[0] & /*newItem, categories*/ 8454144) {
    				set_input_value(input4, /*newItem*/ ctx[16].expiry);
    			}

    			if (/*formErrors*/ ctx[17].expiry) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_2(ctx);
    					if_block3.c();
    					if_block3.m(div9, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div14);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			if (if_block1) if_block1.d();
    			destroy_each(each_blocks, detaching);
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(1780:1) {#if isAddItemModalOpen}",
    		ctx
    	});

    	return block;
    }

    // (1804:8) {#if formErrors.name}
    function create_if_block_5(ctx) {
    	let p;
    	let t_value = /*formErrors*/ ctx[17].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "error-message svelte-ph2e9d");
    			add_location(p, file, 1804, 9, 44307);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*formErrors*/ 131072 && t_value !== (t_value = /*formErrors*/ ctx[17].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(1804:8) {#if formErrors.name}",
    		ctx
    	});

    	return block;
    }

    // (1817:9) {#each categories as category}
    function create_each_block_2(ctx) {
    	let option;
    	let t_value = /*category*/ ctx[100] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*category*/ ctx[100];
    			option.value = option.__value;
    			attr_dev(option, "class", "svelte-ph2e9d");
    			add_location(option, file, 1817, 10, 44621);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(1817:9) {#each categories as category}",
    		ctx
    	});

    	return block;
    }

    // (1844:10) {#each quantityTypes as type}
    function create_each_block_1(ctx) {
    	let option;
    	let t_value = /*type*/ ctx[97] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*type*/ ctx[97];
    			option.value = option.__value;
    			attr_dev(option, "class", "svelte-ph2e9d");
    			add_location(option, file, 1844, 11, 45309);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(1844:10) {#each quantityTypes as type}",
    		ctx
    	});

    	return block;
    }

    // (1849:8) {#if formErrors.quantity}
    function create_if_block_4(ctx) {
    	let p;
    	let t_value = /*formErrors*/ ctx[17].quantity + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "error-message svelte-ph2e9d");
    			add_location(p, file, 1849, 9, 45428);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*formErrors*/ 131072 && t_value !== (t_value = /*formErrors*/ ctx[17].quantity + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(1849:8) {#if formErrors.quantity}",
    		ctx
    	});

    	return block;
    }

    // (1862:9) {#each locations as location}
    function create_each_block(ctx) {
    	let option;
    	let t_value = /*location*/ ctx[94] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*location*/ ctx[94];
    			option.value = option.__value;
    			attr_dev(option, "class", "svelte-ph2e9d");
    			add_location(option, file, 1862, 10, 45745);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(1862:9) {#each locations as location}",
    		ctx
    	});

    	return block;
    }

    // (1889:8) {#if formErrors.price}
    function create_if_block_3(ctx) {
    	let p;
    	let t_value = /*formErrors*/ ctx[17].price + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "error-message svelte-ph2e9d");
    			add_location(p, file, 1889, 9, 46391);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*formErrors*/ 131072 && t_value !== (t_value = /*formErrors*/ ctx[17].price + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(1889:8) {#if formErrors.price}",
    		ctx
    	});

    	return block;
    }

    // (1929:8) {#if formErrors.expiry}
    function create_if_block_2(ctx) {
    	let p;
    	let t_value = /*formErrors*/ ctx[17].expiry + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "error-message svelte-ph2e9d");
    			add_location(p, file, 1929, 9, 47430);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*formErrors*/ 131072 && t_value !== (t_value = /*formErrors*/ ctx[17].expiry + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(1929:8) {#if formErrors.expiry}",
    		ctx
    	});

    	return block;
    }

    // (1955:1) {#if isFoodLogModalOpen}
    function create_if_block(ctx) {
    	let div9;
    	let div8;
    	let div0;
    	let h3;
    	let t1;
    	let button0;
    	let i;
    	let t2;
    	let div7;
    	let form;
    	let div1;
    	let label0;
    	let t3;
    	let span0;
    	let t5;
    	let input0;
    	let t6;
    	let div2;
    	let label1;
    	let t7;
    	let span1;
    	let t9;
    	let input1;
    	let t10;
    	let div3;
    	let label2;
    	let t11;
    	let span2;
    	let t13;
    	let input2;
    	let t14;
    	let div4;
    	let label3;
    	let t15;
    	let span3;
    	let t17;
    	let input3;
    	let t18;
    	let div5;
    	let label4;
    	let t20;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t24;
    	let div6;
    	let button1;
    	let t26;
    	let button2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Log Food Item";
    			t1 = space();
    			button0 = element("button");
    			i = element("i");
    			t2 = space();
    			div7 = element("div");
    			form = element("form");
    			div1 = element("div");
    			label0 = element("label");
    			t3 = text("Food Item ");
    			span0 = element("span");
    			span0.textContent = "*";
    			t5 = space();
    			input0 = element("input");
    			t6 = space();
    			div2 = element("div");
    			label1 = element("label");
    			t7 = text("Amount ");
    			span1 = element("span");
    			span1.textContent = "*";
    			t9 = space();
    			input1 = element("input");
    			t10 = space();
    			div3 = element("div");
    			label2 = element("label");
    			t11 = text("Calories ");
    			span2 = element("span");
    			span2.textContent = "*";
    			t13 = space();
    			input2 = element("input");
    			t14 = space();
    			div4 = element("div");
    			label3 = element("label");
    			t15 = text("Time ");
    			span3 = element("span");
    			span3.textContent = "*";
    			t17 = space();
    			input3 = element("input");
    			t18 = space();
    			div5 = element("div");
    			label4 = element("label");
    			label4.textContent = "Source";
    			t20 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Inventory Item";
    			option1 = element("option");
    			option1.textContent = "Recipe";
    			option2 = element("option");
    			option2.textContent = "Custom Entry";
    			t24 = space();
    			div6 = element("div");
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			t26 = space();
    			button2 = element("button");
    			button2.textContent = "Add Log Entry";
    			attr_dev(h3, "class", "svelte-ph2e9d");
    			add_location(h3, file, 1961, 5, 48082);
    			attr_dev(i, "class", "fas fa-times");
    			add_location(i, file, 1963, 6, 48176);
    			attr_dev(button0, "class", "close-button svelte-ph2e9d");
    			add_location(button0, file, 1962, 5, 48110);
    			attr_dev(div0, "class", "modal-header svelte-ph2e9d");
    			add_location(div0, file, 1960, 4, 48050);
    			attr_dev(span0, "class", "required svelte-ph2e9d");
    			add_location(span0, file, 1976, 19, 48489);
    			attr_dev(label0, "for", "food-name");
    			attr_dev(label0, "class", "svelte-ph2e9d");
    			add_location(label0, file, 1975, 7, 48447);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "food-name");
    			input0.required = true;
    			attr_dev(input0, "class", "svelte-ph2e9d");
    			add_location(input0, file, 1979, 7, 48553);
    			attr_dev(div1, "class", "form-group svelte-ph2e9d");
    			add_location(div1, file, 1974, 6, 48415);
    			attr_dev(span1, "class", "required svelte-ph2e9d");
    			add_location(span1, file, 1984, 16, 48692);
    			attr_dev(label1, "for", "food-amount");
    			attr_dev(label1, "class", "svelte-ph2e9d");
    			add_location(label1, file, 1983, 7, 48651);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "id", "food-amount");
    			attr_dev(input1, "placeholder", "e.g., 1 serving, 100g");
    			input1.required = true;
    			attr_dev(input1, "class", "svelte-ph2e9d");
    			add_location(input1, file, 1986, 7, 48747);
    			attr_dev(div2, "class", "form-group svelte-ph2e9d");
    			add_location(div2, file, 1982, 6, 48619);
    			attr_dev(span2, "class", "required svelte-ph2e9d");
    			add_location(span2, file, 1996, 18, 48967);
    			attr_dev(label2, "for", "food-calories");
    			attr_dev(label2, "class", "svelte-ph2e9d");
    			add_location(label2, file, 1995, 7, 48922);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "id", "food-calories");
    			attr_dev(input2, "min", "0");
    			input2.required = true;
    			attr_dev(input2, "class", "svelte-ph2e9d");
    			add_location(input2, file, 1998, 7, 49022);
    			attr_dev(div3, "class", "form-group svelte-ph2e9d");
    			add_location(div3, file, 1994, 6, 48890);
    			attr_dev(span3, "class", "required svelte-ph2e9d");
    			add_location(span3, file, 2008, 14, 49210);
    			attr_dev(label3, "for", "food-time");
    			attr_dev(label3, "class", "svelte-ph2e9d");
    			add_location(label3, file, 2007, 7, 49173);
    			attr_dev(input3, "type", "time");
    			attr_dev(input3, "id", "food-time");
    			input3.required = true;
    			attr_dev(input3, "class", "svelte-ph2e9d");
    			add_location(input3, file, 2010, 7, 49265);
    			attr_dev(div4, "class", "form-group svelte-ph2e9d");
    			add_location(div4, file, 2006, 6, 49141);
    			attr_dev(label4, "for", "food-source");
    			attr_dev(label4, "class", "svelte-ph2e9d");
    			add_location(label4, file, 2014, 7, 49363);
    			option0.__value = "Inventory Item";
    			option0.value = option0.__value;
    			attr_dev(option0, "class", "svelte-ph2e9d");
    			add_location(option0, file, 2016, 8, 49444);
    			option1.__value = "Recipe";
    			option1.value = option1.__value;
    			attr_dev(option1, "class", "svelte-ph2e9d");
    			add_location(option1, file, 2017, 8, 49484);
    			option2.__value = "Custom Entry";
    			option2.value = option2.__value;
    			attr_dev(option2, "class", "svelte-ph2e9d");
    			add_location(option2, file, 2018, 8, 49516);
    			attr_dev(select, "id", "food-source");
    			attr_dev(select, "class", "svelte-ph2e9d");
    			add_location(select, file, 2015, 7, 49410);
    			attr_dev(div5, "class", "form-group svelte-ph2e9d");
    			add_location(div5, file, 2013, 6, 49331);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "secondary-button svelte-ph2e9d");
    			add_location(button1, file, 2023, 7, 49617);
    			attr_dev(button2, "type", "submit");
    			attr_dev(button2, "class", "primary-button svelte-ph2e9d");
    			add_location(button2, file, 2030, 7, 49766);
    			attr_dev(div6, "class", "form-actions svelte-ph2e9d");
    			add_location(div6, file, 2022, 6, 49583);
    			add_location(form, file, 1968, 5, 48269);
    			attr_dev(div7, "class", "modal-content svelte-ph2e9d");
    			add_location(div7, file, 1967, 4, 48236);
    			attr_dev(div8, "class", "modal small-modal svelte-ph2e9d");
    			add_location(div8, file, 1956, 3, 47964);
    			attr_dev(div9, "class", "modal-overlay svelte-ph2e9d");
    			add_location(div9, file, 1955, 2, 47903);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, i);
    			append_dev(div8, t2);
    			append_dev(div8, div7);
    			append_dev(div7, form);
    			append_dev(form, div1);
    			append_dev(div1, label0);
    			append_dev(label0, t3);
    			append_dev(label0, span0);
    			append_dev(div1, t5);
    			append_dev(div1, input0);
    			append_dev(form, t6);
    			append_dev(form, div2);
    			append_dev(div2, label1);
    			append_dev(label1, t7);
    			append_dev(label1, span1);
    			append_dev(div2, t9);
    			append_dev(div2, input1);
    			append_dev(form, t10);
    			append_dev(form, div3);
    			append_dev(div3, label2);
    			append_dev(label2, t11);
    			append_dev(label2, span2);
    			append_dev(div3, t13);
    			append_dev(div3, input2);
    			append_dev(form, t14);
    			append_dev(form, div4);
    			append_dev(div4, label3);
    			append_dev(label3, t15);
    			append_dev(label3, span3);
    			append_dev(div4, t17);
    			append_dev(div4, input3);
    			append_dev(form, t18);
    			append_dev(form, div5);
    			append_dev(div5, label4);
    			append_dev(div5, t20);
    			append_dev(div5, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(form, t24);
    			append_dev(form, div6);
    			append_dev(div6, button1);
    			append_dev(div6, t26);
    			append_dev(div6, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*toggleFoodLogModal*/ ctx[32], false, false, false, false),
    					listen_dev(button1, "click", /*toggleFoodLogModal*/ ctx[32], false, false, false, false),
    					listen_dev(form, "submit", prevent_default(/*submit_handler*/ ctx[89]), false, true, false, false),
    					listen_dev(div8, "click", click_handler_27, false, false, false, false),
    					listen_dev(div9, "click", /*toggleFoodLogModal*/ ctx[32], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(1955:1) {#if isFoodLogModalOpen}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div3;
    	let t0;
    	let header;
    	let div0;
    	let i0;
    	let t1;
    	let h1;
    	let t3;
    	let div2;
    	let div1;
    	let input;
    	let t4;
    	let i1;
    	let t5;
    	let button0;
    	let i2;
    	let t6;
    	let button1;
    	let i3;
    	let t7;
    	let nav;
    	let button2;
    	let i4;
    	let t8;
    	let button2_class_value;
    	let t9;
    	let button3;
    	let i5;
    	let t10;
    	let button3_class_value;
    	let t11;
    	let button4;
    	let i6;
    	let t12;
    	let button4_class_value;
    	let t13;
    	let button5;
    	let i7;
    	let t14;
    	let button5_class_value;
    	let t15;
    	let main;
    	let t16;
    	let t17;
    	let t18;
    	let t19;
    	let t20;
    	let t21;
    	let t22;
    	let t23;
    	let link;
    	let mounted;
    	let dispose;
    	let if_block0 = /*notification*/ ctx[15] && create_if_block_28(ctx);
    	let if_block1 = /*activeTab*/ ctx[2] === "inventory" && create_if_block_26(ctx);
    	let if_block2 = /*activeTab*/ ctx[2] === "recipes" && create_if_block_21(ctx);
    	let if_block3 = /*activeTab*/ ctx[2] === "shopping" && create_if_block_17(ctx);
    	let if_block4 = /*activeTab*/ ctx[2] === "nutrition" && create_if_block_16(ctx);
    	let if_block5 = /*isDetailModalOpen*/ ctx[8] && /*selectedItem*/ ctx[11] && create_if_block_12(ctx);
    	let if_block6 = /*isRecipeDetailOpen*/ ctx[9] && /*selectedRecipe*/ ctx[12] && create_if_block_6(ctx);
    	let if_block7 = /*isAddItemModalOpen*/ ctx[7] && create_if_block_1(ctx);
    	let if_block8 = /*isFoodLogModalOpen*/ ctx[10] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			header = element("header");
    			div0 = element("div");
    			i0 = element("i");
    			t1 = space();
    			h1 = element("h1");
    			h1.textContent = "Kitchinventory";
    			t3 = space();
    			div2 = element("div");
    			div1 = element("div");
    			input = element("input");
    			t4 = space();
    			i1 = element("i");
    			t5 = space();
    			button0 = element("button");
    			i2 = element("i");
    			t6 = space();
    			button1 = element("button");
    			i3 = element("i");
    			t7 = space();
    			nav = element("nav");
    			button2 = element("button");
    			i4 = element("i");
    			t8 = text(" Inventory");
    			t9 = space();
    			button3 = element("button");
    			i5 = element("i");
    			t10 = text(" Recipes");
    			t11 = space();
    			button4 = element("button");
    			i6 = element("i");
    			t12 = text(" Shopping");
    			t13 = space();
    			button5 = element("button");
    			i7 = element("i");
    			t14 = text(" Nutrition");
    			t15 = space();
    			main = element("main");
    			if (if_block1) if_block1.c();
    			t16 = space();
    			if (if_block2) if_block2.c();
    			t17 = space();
    			if (if_block3) if_block3.c();
    			t18 = space();
    			if (if_block4) if_block4.c();
    			t19 = space();
    			if (if_block5) if_block5.c();
    			t20 = space();
    			if (if_block6) if_block6.c();
    			t21 = space();
    			if (if_block7) if_block7.c();
    			t22 = space();
    			if (if_block8) if_block8.c();
    			t23 = space();
    			link = element("link");
    			attr_dev(i0, "class", "fas fa-utensils");
    			add_location(i0, file, 756, 3, 16583);
    			attr_dev(h1, "class", "svelte-ph2e9d");
    			add_location(h1, file, 757, 3, 16618);
    			attr_dev(div0, "class", "logo svelte-ph2e9d");
    			add_location(div0, file, 755, 2, 16561);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Search...");
    			attr_dev(input, "class", "search-input svelte-ph2e9d");
    			add_location(input, file, 761, 4, 16720);
    			attr_dev(i1, "class", "fas fa-search search-icon svelte-ph2e9d");
    			add_location(i1, file, 773, 4, 17029);
    			attr_dev(div1, "class", "search-container svelte-ph2e9d");
    			add_location(div1, file, 760, 3, 16685);
    			attr_dev(i2, "class", "fas fa-bell");
    			add_location(i2, file, 776, 4, 17117);
    			attr_dev(button0, "class", "icon-button svelte-ph2e9d");
    			add_location(button0, file, 775, 3, 17084);
    			attr_dev(i3, "class", "fas fa-user");
    			add_location(i3, file, 779, 4, 17194);
    			attr_dev(button1, "class", "icon-button svelte-ph2e9d");
    			add_location(button1, file, 778, 3, 17161);
    			attr_dev(div2, "class", "header-actions svelte-ph2e9d");
    			add_location(div2, file, 759, 2, 16653);
    			attr_dev(header, "class", "header svelte-ph2e9d");
    			add_location(header, file, 754, 1, 16535);
    			attr_dev(i4, "class", "fas fa-box-open");
    			add_location(i4, file, 790, 3, 17430);
    			attr_dev(button2, "class", button2_class_value = "nav-button " + (/*activeTab*/ ctx[2] === 'inventory' ? 'active' : '') + " svelte-ph2e9d");
    			add_location(button2, file, 786, 2, 17303);
    			attr_dev(i5, "class", "fas fa-utensils");
    			add_location(i5, file, 796, 3, 17609);
    			attr_dev(button3, "class", button3_class_value = "nav-button " + (/*activeTab*/ ctx[2] === 'recipes' ? 'active' : '') + " svelte-ph2e9d");
    			add_location(button3, file, 792, 2, 17486);
    			attr_dev(i6, "class", "fas fa-shopping-cart");
    			add_location(i6, file, 802, 3, 17788);
    			attr_dev(button4, "class", button4_class_value = "nav-button " + (/*activeTab*/ ctx[2] === 'shopping' ? 'active' : '') + " svelte-ph2e9d");
    			add_location(button4, file, 798, 2, 17663);
    			attr_dev(i7, "class", "fas fa-chart-pie");
    			add_location(i7, file, 808, 3, 17975);
    			attr_dev(button5, "class", button5_class_value = "nav-button " + (/*activeTab*/ ctx[2] === 'nutrition' ? 'active' : '') + " svelte-ph2e9d");
    			add_location(button5, file, 804, 2, 17848);
    			attr_dev(nav, "class", "main-nav svelte-ph2e9d");
    			add_location(nav, file, 785, 1, 17278);
    			attr_dev(main, "class", "main-content svelte-ph2e9d");
    			add_location(main, file, 813, 1, 18063);
    			attr_dev(div3, "class", "app svelte-ph2e9d");
    			add_location(div3, file, 738, 0, 16130);
    			attr_dev(link, "href", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css");
    			attr_dev(link, "rel", "stylesheet");
    			add_location(link, file, 2042, 1, 49937);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			if (if_block0) if_block0.m(div3, null);
    			append_dev(div3, t0);
    			append_dev(div3, header);
    			append_dev(header, div0);
    			append_dev(div0, i0);
    			append_dev(div0, t1);
    			append_dev(div0, h1);
    			append_dev(header, t3);
    			append_dev(header, div2);
    			append_dev(div2, div1);
    			append_dev(div1, input);
    			set_input_value(input, /*searchQuery*/ ctx[0]);
    			append_dev(div1, t4);
    			append_dev(div1, i1);
    			append_dev(div2, t5);
    			append_dev(div2, button0);
    			append_dev(button0, i2);
    			append_dev(div2, t6);
    			append_dev(div2, button1);
    			append_dev(button1, i3);
    			append_dev(div3, t7);
    			append_dev(div3, nav);
    			append_dev(nav, button2);
    			append_dev(button2, i4);
    			append_dev(button2, t8);
    			append_dev(nav, t9);
    			append_dev(nav, button3);
    			append_dev(button3, i5);
    			append_dev(button3, t10);
    			append_dev(nav, t11);
    			append_dev(nav, button4);
    			append_dev(button4, i6);
    			append_dev(button4, t12);
    			append_dev(nav, t13);
    			append_dev(nav, button5);
    			append_dev(button5, i7);
    			append_dev(button5, t14);
    			append_dev(div3, t15);
    			append_dev(div3, main);
    			if (if_block1) if_block1.m(main, null);
    			append_dev(main, t16);
    			if (if_block2) if_block2.m(main, null);
    			append_dev(main, t17);
    			if (if_block3) if_block3.m(main, null);
    			append_dev(main, t18);
    			if (if_block4) if_block4.m(main, null);
    			append_dev(div3, t19);
    			if (if_block5) if_block5.m(div3, null);
    			append_dev(div3, t20);
    			if (if_block6) if_block6.m(div3, null);
    			append_dev(div3, t21);
    			if (if_block7) if_block7.m(div3, null);
    			append_dev(div3, t22);
    			if (if_block8) if_block8.m(div3, null);
    			insert_dev(target, t23, anchor);
    			append_dev(document_1.head, link);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[46]),
    					listen_dev(input, "input", /*input_handler*/ ctx[47], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_1*/ ctx[48], false, false, false, false),
    					listen_dev(button3, "click", /*click_handler_2*/ ctx[49], false, false, false, false),
    					listen_dev(button4, "click", /*click_handler_3*/ ctx[50], false, false, false, false),
    					listen_dev(button5, "click", /*click_handler_4*/ ctx[51], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*notification*/ ctx[15]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_28(ctx);
    					if_block0.c();
    					if_block0.m(div3, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*searchQuery*/ 1 && input.value !== /*searchQuery*/ ctx[0]) {
    				set_input_value(input, /*searchQuery*/ ctx[0]);
    			}

    			if (dirty[0] & /*activeTab*/ 4 && button2_class_value !== (button2_class_value = "nav-button " + (/*activeTab*/ ctx[2] === 'inventory' ? 'active' : '') + " svelte-ph2e9d")) {
    				attr_dev(button2, "class", button2_class_value);
    			}

    			if (dirty[0] & /*activeTab*/ 4 && button3_class_value !== (button3_class_value = "nav-button " + (/*activeTab*/ ctx[2] === 'recipes' ? 'active' : '') + " svelte-ph2e9d")) {
    				attr_dev(button3, "class", button3_class_value);
    			}

    			if (dirty[0] & /*activeTab*/ 4 && button4_class_value !== (button4_class_value = "nav-button " + (/*activeTab*/ ctx[2] === 'shopping' ? 'active' : '') + " svelte-ph2e9d")) {
    				attr_dev(button4, "class", button4_class_value);
    			}

    			if (dirty[0] & /*activeTab*/ 4 && button5_class_value !== (button5_class_value = "nav-button " + (/*activeTab*/ ctx[2] === 'nutrition' ? 'active' : '') + " svelte-ph2e9d")) {
    				attr_dev(button5, "class", button5_class_value);
    			}

    			if (/*activeTab*/ ctx[2] === "inventory") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_26(ctx);
    					if_block1.c();
    					if_block1.m(main, t16);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*activeTab*/ ctx[2] === "recipes") {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_21(ctx);
    					if_block2.c();
    					if_block2.m(main, t17);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*activeTab*/ ctx[2] === "shopping") {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_17(ctx);
    					if_block3.c();
    					if_block3.m(main, t18);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*activeTab*/ ctx[2] === "nutrition") {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_16(ctx);
    					if_block4.c();
    					if_block4.m(main, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*isDetailModalOpen*/ ctx[8] && /*selectedItem*/ ctx[11]) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_12(ctx);
    					if_block5.c();
    					if_block5.m(div3, t20);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (/*isRecipeDetailOpen*/ ctx[9] && /*selectedRecipe*/ ctx[12]) {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);
    				} else {
    					if_block6 = create_if_block_6(ctx);
    					if_block6.c();
    					if_block6.m(div3, t21);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}

    			if (/*isAddItemModalOpen*/ ctx[7]) {
    				if (if_block7) {
    					if_block7.p(ctx, dirty);
    				} else {
    					if_block7 = create_if_block_1(ctx);
    					if_block7.c();
    					if_block7.m(div3, t22);
    				}
    			} else if (if_block7) {
    				if_block7.d(1);
    				if_block7 = null;
    			}

    			if (/*isFoodLogModalOpen*/ ctx[10]) {
    				if (if_block8) {
    					if_block8.p(ctx, dirty);
    				} else {
    					if_block8 = create_if_block(ctx);
    					if_block8.c();
    					if_block8.m(div3, null);
    				}
    			} else if (if_block8) {
    				if_block8.d(1);
    				if_block8 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (if_block7) if_block7.d();
    			if (if_block8) if_block8.d();
    			if (detaching) detach_dev(t23);
    			detach_dev(link);
    			mounted = false;
    			run_all(dispose);
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

    function calculateDaysUntilExpiry(expiryDate) {
    	const expiry = new Date(expiryDate);
    	const today = new Date();
    	const diffTime = expiry - today;
    	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    	return diffDays;
    }

    function getExpiryStatusClass(expiryDate) {
    	const daysLeft = calculateDaysUntilExpiry(expiryDate);
    	if (daysLeft < 0) return "expired";
    	if (daysLeft <= 3) return "expiring-soon";
    	return "valid";
    }

    function formatCurrency(amount) {
    	return `$${Number(amount).toFixed(2)}`;
    }

    const func = i => i.required;

    const click_handler_6 = e => {
    	e.stopPropagation();
    }; // Handle edit (not implemented)

    const click_handler_7 = e => e.stopPropagation();
    const func_1 = i => i.required;
    const func_2 = i => i.required;
    const func_3 = item => item.checked;
    const click_handler_20 = e => e.stopPropagation();
    const click_handler_23 = e => e.stopPropagation();
    const click_handler_26 = e => e.stopPropagation();
    const click_handler_27 = e => e.stopPropagation();

    function instance($$self, $$props, $$invalidate) {
    	let filteredRecipes;
    	let filteredShoppingList;
    	let filteredFoodLog;
    	let hasAutomaticItems;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	let inventoryItems = [
    		{
    			id: 1,
    			name: "Milk",
    			quantity: "1 gallon",
    			location: "Main Fridge",
    			expiry: "2025-04-01",
    			category: "Dairy",
    			image: "https://via.placeholder.com/50",
    			percentRemaining: 80,
    			brand: "Organic Valley",
    			price: 4.99
    		},
    		{
    			id: 2,
    			name: "Eggs",
    			quantity: "10 count",
    			location: "Main Fridge",
    			expiry: "2025-04-13",
    			category: "Dairy",
    			image: "https://via.placeholder.com/50",
    			percentRemaining: 90,
    			brand: "Farm Fresh",
    			price: 3.49
    		},
    		{
    			id: 3,
    			name: "Spinach",
    			quantity: "1 bag",
    			location: "Main Fridge",
    			expiry: "2025-03-30",
    			category: "Produce",
    			image: "https://via.placeholder.com/50",
    			percentRemaining: 60,
    			brand: "Green Farms",
    			price: 2.99
    		},
    		{
    			id: 4,
    			name: "Chicken Breast",
    			quantity: "2 lbs",
    			location: "Freezer",
    			expiry: "2025-06-15",
    			category: "Meat",
    			image: "https://via.placeholder.com/50",
    			percentRemaining: 100,
    			brand: "Valley Farms",
    			price: 9.99
    		},
    		{
    			id: 5,
    			name: "Rice",
    			quantity: "2 lbs",
    			location: "Pantry",
    			expiry: "2025-12-31",
    			category: "Grains",
    			image: "https://via.placeholder.com/50",
    			percentRemaining: 45,
    			brand: "Jasmine Fields",
    			price: 3.29
    		}
    	];

    	const recipeItems = [
    		{
    			id: 1,
    			name: "Spinach and Egg Breakfast Bowl",
    			ingredients: [
    				{
    					name: "Eggs",
    					amount: "2",
    					required: true,
    					inInventory: true
    				},
    				{
    					name: "Spinach",
    					amount: "1 cup",
    					required: true,
    					inInventory: true
    				},
    				{
    					name: "Onions",
    					amount: "1/4 cup",
    					required: false,
    					inInventory: false
    				},
    				{
    					name: "Salt",
    					amount: "to taste",
    					required: false,
    					inInventory: true
    				},
    				{
    					name: "Pepper",
    					amount: "to taste",
    					required: false,
    					inInventory: true
    				}
    			],
    			image: "https://via.placeholder.com/150",
    			cookTime: "15 min",
    			matchPercentage: 100,
    			instructions: [
    				"Heat a non-stick pan over medium heat",
    				"Add chopped onions and sauté until translucent",
    				"Add spinach and cook until wilted",
    				"Crack eggs directly into the pan and scramble with the vegetables",
    				"Season with salt and pepper to taste",
    				"Serve hot in a bowl"
    			],
    			difficulty: "Easy",
    			servings: 1,
    			calories: 220
    		},
    		{
    			id: 2,
    			name: "Chicken and Rice Bowl",
    			ingredients: [
    				{
    					name: "Chicken Breast",
    					amount: "6 oz",
    					required: true,
    					inInventory: true
    				},
    				{
    					name: "Rice",
    					amount: "1 cup cooked",
    					required: true,
    					inInventory: true
    				},
    				{
    					name: "Tomatoes",
    					amount: "1/2 cup diced",
    					required: true,
    					inInventory: false
    				},
    				{
    					name: "Olive Oil",
    					amount: "1 tbsp",
    					required: false,
    					inInventory: false
    				},
    				{
    					name: "Garlic",
    					amount: "2 cloves",
    					required: false,
    					inInventory: false
    				},
    				{
    					name: "Salt",
    					amount: "to taste",
    					required: false,
    					inInventory: true
    				},
    				{
    					name: "Pepper",
    					amount: "to taste",
    					required: false,
    					inInventory: true
    				}
    			],
    			image: "https://via.placeholder.com/150",
    			cookTime: "25 min",
    			matchPercentage: 85,
    			instructions: [
    				"Season chicken with salt and pepper",
    				"Heat olive oil in a pan over medium-high heat",
    				"Cook chicken until internal temperature reaches 165°F",
    				"Let chicken rest for 5 minutes, then dice",
    				"Combine cooked rice, diced chicken, and tomatoes in a bowl",
    				"Season with additional salt and pepper if needed"
    			],
    			difficulty: "Medium",
    			servings: 2,
    			calories: 450
    		}
    	];

    	let shoppingList = [
    		{
    			id: 1,
    			name: "Butter",
    			category: "Dairy",
    			automatic: true,
    			reason: "Low stock",
    			checked: false
    		},
    		{
    			id: 2,
    			name: "Bread",
    			category: "Bakery",
    			automatic: true,
    			reason: "Out of stock",
    			checked: false
    		},
    		{
    			id: 3,
    			name: "Apples",
    			category: "Produce",
    			automatic: false,
    			reason: "Manually added",
    			checked: true
    		},
    		{
    			id: 4,
    			name: "Olive Oil",
    			category: "Pantry",
    			automatic: true,
    			reason: "Low stock",
    			checked: false
    		}
    	];

    	const categories = [
    		"Dairy",
    		"Produce",
    		"Meat",
    		"Grains",
    		"Pantry",
    		"Beverages",
    		"Frozen",
    		"Snacks"
    	];

    	const locations = ["Main Fridge", "Freezer", "Pantry"];

    	const quantityTypes = [
    		"count",
    		"oz",
    		"lbs",
    		"g",
    		"kg",
    		"ml",
    		"L",
    		"cup",
    		"tbsp",
    		"tsp",
    		"gallon",
    		"quart",
    		"pint",
    		"bunch",
    		"package",
    		"bag",
    		"box",
    		"can",
    		"bottle"
    	];

    	// State variables
    	let activeTab = "inventory";

    	let selectedLocation = "All Locations";
    	let selectedCategory = "All Categories";
    	let sortBy = "expiryDate";
    	let sortOrder = "asc";
    	let searchQuery = "";
    	let isAddItemModalOpen = false;
    	let isDetailModalOpen = false;
    	let isRecipeDetailOpen = false;
    	let isFoodLogModalOpen = false;
    	let selectedItem = null;
    	let selectedRecipe = null;
    	let filteredItems = [];
    	let adjustAmount = 1;
    	let notification = null; // For showing temporary notifications

    	const foodLog = [
    		{
    			id: 1,
    			name: "Breakfast Bowl",
    			amount: "1 serving",
    			calories: 320,
    			time: "7:30 AM"
    		},
    		{
    			id: 2,
    			name: "Coffee with Milk",
    			amount: "12 oz",
    			calories: 85,
    			time: "7:45 AM"
    		},
    		{
    			id: 3,
    			name: "Chicken Salad",
    			amount: "1 bowl",
    			calories: 410,
    			time: "12:15 PM"
    		},
    		{
    			id: 4,
    			name: "Apple",
    			amount: "1 medium",
    			calories: 95,
    			time: "3:30 PM"
    		}
    	];

    	// New item form
    	let newItem = {
    		name: "",
    		category: "Dairy",
    		location: "Main Fridge",
    		quantityAmount: 1,
    		quantityType: "count",
    		brand: "",
    		price: "",
    		expiry: new Date().toISOString().split("T")[0],
    		percentRemaining: 100
    	};

    	let formErrors = {};

    	// Shopping list state
    	let newShoppingItem = "";

    	// Function to toggle a shopping item's checked state
    	function toggleShoppingItemChecked(id) {
    		$$invalidate(44, shoppingList = shoppingList.map(item => {
    			if (item.id === id) {
    				return { ...item, checked: !item.checked };
    			}

    			return item;
    		}));
    	}

    	// Functions
    	function setActiveTab(tab) {
    		$$invalidate(2, activeTab = tab);
    	}

    	function filterInventory() {
    		// Start with all items
    		let result = [...inventoryItems];

    		// Filter by location
    		if (selectedLocation !== "All Locations") {
    			result = result.filter(item => item.location === selectedLocation);
    		}

    		// Filter by category
    		if (selectedCategory !== "All Categories") {
    			result = result.filter(item => item.category === selectedCategory);
    		}

    		// Filter by search
    		if (searchQuery.trim() !== "") {
    			result = result.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase()) || item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    		}

    		// Sort items
    		if (sortBy === "name") {
    			result.sort((a, b) => sortOrder === "asc"
    			? a.name.localeCompare(b.name)
    			: b.name.localeCompare(a.name));
    		} else if (sortBy === "expiryDate") {
    			result.sort((a, b) => {
    				const dateA = new Date(a.expiry);
    				const dateB = new Date(b.expiry);
    				return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    			});
    		} else if (sortBy === "percentRemaining") {
    			result.sort((a, b) => sortOrder === "asc"
    			? a.percentRemaining - b.percentRemaining
    			: b.percentRemaining - a.percentRemaining);
    		}

    		$$invalidate(13, filteredItems = result);
    	}

    	function toggleAddItemModal() {
    		$$invalidate(7, isAddItemModalOpen = !isAddItemModalOpen);

    		if (!isAddItemModalOpen) {
    			// Reset form when closing
    			resetNewItemForm();
    		}
    	}

    	function toggleDetailModal(item = null) {
    		$$invalidate(11, selectedItem = item);
    		$$invalidate(8, isDetailModalOpen = !isDetailModalOpen);
    	}

    	function toggleRecipeDetail(recipe = null) {
    		$$invalidate(12, selectedRecipe = recipe);
    		$$invalidate(9, isRecipeDetailOpen = !isRecipeDetailOpen);
    	}

    	function toggleFoodLogModal() {
    		$$invalidate(10, isFoodLogModalOpen = !isFoodLogModalOpen);
    	}

    	function validateNewItemForm() {
    		const errors = {};

    		if (!newItem.name.trim()) {
    			errors.name = "Name is required";
    		}

    		if (!newItem.quantityAmount || isNaN(newItem.quantityAmount) || newItem.quantityAmount <= 0) {
    			errors.quantity = "Valid quantity amount is required";
    		}

    		if (!newItem.expiry) {
    			errors.expiry = "Expiry date is required";
    		}

    		if (newItem.price && isNaN(Number(newItem.price))) {
    			errors.price = "Price must be a valid number";
    		}

    		$$invalidate(17, formErrors = errors);
    		return Object.keys(errors).length === 0;
    	}

    	function addNewItem() {
    		if (!validateNewItemForm()) {
    			return;
    		}

    		const newId = Math.max(...inventoryItems.map(item => item.id), 0) + 1;

    		// Format the quantity string
    		const formattedQuantity = `${newItem.quantityAmount} ${newItem.quantityType}`;

    		const itemToAdd = {
    			...newItem,
    			id: newId,
    			quantity: formattedQuantity,
    			price: newItem.price ? Number(newItem.price) : 0,
    			image: "https://via.placeholder.com/50"
    		};

    		// Remove the separate quantity fields before adding to inventory
    		delete itemToAdd.quantityAmount;

    		delete itemToAdd.quantityType;
    		inventoryItems.push(itemToAdd);
    		$$invalidate(1, inventoryItems); // Trigger reactivity
    		toggleAddItemModal();
    		filterInventory();
    		showNotification(`${itemToAdd.name} added to your inventory`);
    	}

    	function resetNewItemForm() {
    		$$invalidate(16, newItem = {
    			name: "",
    			category: "Dairy",
    			location: "Main Fridge",
    			quantityAmount: 1,
    			quantityType: "count",
    			brand: "",
    			price: "",
    			expiry: new Date().toISOString().split("T")[0],
    			percentRemaining: 100
    		});

    		$$invalidate(17, formErrors = {});
    	}

    	function addToShoppingList() {
    		if (!newShoppingItem.trim()) {
    			showNotification("Please enter an item name", "error");
    			return;
    		}

    		const newId = Math.max(...shoppingList.map(item => item.id), 0) + 1;

    		const itemToAdd = {
    			id: newId,
    			name: newShoppingItem,
    			category: "Other",
    			automatic: false,
    			reason: "Manually added",
    			checked: false
    		};

    		shoppingList.push(itemToAdd);
    		$$invalidate(44, shoppingList); // Trigger reactivity
    		showNotification(`${newShoppingItem} added to your shopping list`);

    		// Reset input
    		$$invalidate(18, newShoppingItem = "");
    	}

    	function adjustItemQuantity(item, amount, action) {
    		if (!amount || isNaN(amount) || amount <= 0) {
    			showNotification("Please enter a valid quantity amount", "error");
    			return;
    		}

    		// Find the item in the inventory
    		const index = inventoryItems.findIndex(i => i.id === item.id);

    		if (index !== -1) {
    			// Calculate new percentage
    			let newPercentage;

    			const oldPercentage = inventoryItems[index].percentRemaining;

    			if (action === "add") {
    				// Add - can't go above 100%
    				newPercentage = Math.min(100, oldPercentage + Number(amount));

    				if (newPercentage === 100 && oldPercentage < 100) {
    					showNotification(`Added ${amount}% to ${item.name}. Item is now full.`);
    				} else if (newPercentage === oldPercentage) {
    					showNotification(`${item.name} is already full!`, "info");
    				} else {
    					showNotification(`Added ${amount}% to ${item.name}`);
    				}
    			} else {
    				// Remove - can't go below 0%
    				newPercentage = Math.max(0, oldPercentage - Number(amount));

    				if (newPercentage === 0 && oldPercentage > 0) {
    					showNotification(`Used ${amount}% of ${item.name}. Item is now empty!`, "warning");
    				} else if (newPercentage === oldPercentage) {
    					showNotification(`${item.name} is already empty!`, "info");
    				} else {
    					showNotification(`Used ${amount}% of ${item.name}`);
    				}
    			}

    			// Update the item
    			$$invalidate(
    				1,
    				inventoryItems[index] = {
    					...inventoryItems[index],
    					percentRemaining: newPercentage
    				},
    				inventoryItems
    			);

    			// If percentage is low, add to shopping list automatically
    			if (newPercentage <= 20 && !shoppingList.some(i => i.name === item.name)) {
    				const newId = Math.max(...shoppingList.map(item => item.id), 0) + 1;

    				shoppingList.push({
    					id: newId,
    					name: item.name,
    					category: item.category,
    					automatic: true,
    					reason: "Low stock",
    					checked: false
    				});

    				$$invalidate(44, shoppingList); // Trigger reactivity
    				showNotification(`${item.name} added to shopping list automatically`, "info");
    			}

    			// Trigger reactivity
    			$$invalidate(1, inventoryItems);

    			filterInventory();
    		}
    	}

    	onMount(() => {
    		filterInventory();
    	});

    	// Filter recipe items based on search query
    	function filterRecipes() {
    		if (!searchQuery.trim()) {
    			return recipeItems;
    		}

    		return recipeItems.filter(recipe => recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) || recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchQuery.toLowerCase())));
    	}

    	// Filter shopping list based on search query
    	function filterShoppingList() {
    		if (!searchQuery.trim()) {
    			return shoppingList;
    		}

    		return shoppingList.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase()));
    	}

    	// Filter food log based on search query
    	function filterFoodLog() {
    		if (!searchQuery.trim()) {
    			return foodLog;
    		}

    		return foodLog.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    	}

    	// Function to sort shopping list
    	function sortShoppingList(by) {
    		if (by === "category") {
    			$$invalidate(44, shoppingList = shoppingList.sort((a, b) => a.category.localeCompare(b.category)));
    		} else if (by === "name") {
    			$$invalidate(44, shoppingList = shoppingList.sort((a, b) => a.name.localeCompare(b.name)));
    		}
    	}

    	// Function to clear checked items
    	function clearCheckedItems() {
    		$$invalidate(44, shoppingList = shoppingList.filter(item => !item.checked));
    	}

    	// Function to refresh automatic items based on current inventory
    	function refreshAutomaticItems() {
    		// First, remove all automatic items
    		$$invalidate(44, shoppingList = shoppingList.filter(item => !item.automatic));

    		// Then check inventory for low items and add them automatically
    		for (const item of inventoryItems) {
    			if (item.percentRemaining <= 20 && !shoppingList.some(i => i.name === item.name)) {
    				const newId = Math.max(...shoppingList.map(item => item.id || 0), 0) + 1;

    				shoppingList.push({
    					id: newId,
    					name: item.name,
    					category: item.category,
    					automatic: true,
    					reason: "Low stock",
    					checked: false
    				});
    			}
    		}

    		// Trigger reactivity
    		$$invalidate(44, shoppingList);
    	}

    	// Function to delete a shopping item
    	function deleteShoppingItem(id) {
    		$$invalidate(44, shoppingList = shoppingList.filter(item => item.id !== id));
    	}

    	// Function to show a temporary notification
    	function showNotification(message, type = "success") {
    		$$invalidate(15, notification = { message, type });

    		// Auto-remove the notification after 3 seconds
    		setTimeout(
    			() => {
    				$$invalidate(15, notification = null);
    			},
    			3000
    		);
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(15, notification = null);

    	function input_input_handler() {
    		searchQuery = this.value;
    		$$invalidate(0, searchQuery);
    	}

    	const input_handler = () => {
    		filterInventory();
    		$$invalidate(22, filteredRecipes = filterRecipes());
    		$$invalidate(21, filteredShoppingList = filterShoppingList());
    		$$invalidate(20, filteredFoodLog = filterFoodLog());
    	};

    	const click_handler_1 = () => setActiveTab("inventory");
    	const click_handler_2 = () => setActiveTab("recipes");
    	const click_handler_3 = () => setActiveTab("shopping");
    	const click_handler_4 = () => setActiveTab("nutrition");

    	function select0_change_handler() {
    		selectedLocation = select_value(this);
    		$$invalidate(3, selectedLocation);
    		$$invalidate(24, locations);
    	}

    	function select1_change_handler() {
    		selectedCategory = select_value(this);
    		$$invalidate(4, selectedCategory);
    		$$invalidate(23, categories);
    	}

    	function select2_change_handler() {
    		sortBy = select_value(this);
    		$$invalidate(5, sortBy);
    	}

    	const click_handler_5 = () => {
    		$$invalidate(6, sortOrder = sortOrder === "asc" ? "desc" : "asc");
    		filterInventory();
    	};

    	function input_input_handler_1() {
    		adjustAmount = to_number(this.value);
    		$$invalidate(14, adjustAmount);
    	}

    	const click_handler_8 = (item, e) => {
    		e.stopPropagation();
    		adjustItemQuantity(item, adjustAmount, "add");
    	};

    	const click_handler_9 = (item, e) => {
    		e.stopPropagation();
    		adjustItemQuantity(item, adjustAmount, "remove");
    	};

    	const click_handler_10 = item => toggleDetailModal(item);
    	const click_handler_11 = recipe => toggleRecipeDetail(recipe);

    	function input_input_handler_2() {
    		newShoppingItem = this.value;
    		$$invalidate(18, newShoppingItem);
    	}

    	const keypress_handler = e => {
    		if (e.key === "Enter") {
    			addToShoppingList();
    		}
    	};

    	const change_handler = item => toggleShoppingItemChecked(item.id);

    	const click_handler_12 = (item, e) => {
    		e.stopPropagation();
    		deleteShoppingItem(item.id);
    		showNotification(`${item.name} removed from shopping list`);
    	};

    	function input_input_handler_3() {
    		newShoppingItem = this.value;
    		$$invalidate(18, newShoppingItem);
    	}

    	const keypress_handler_1 = e => {
    		if (e.key === "Enter") {
    			addToShoppingList();
    		}
    	};

    	const click_handler_13 = () => sortShoppingList("category");
    	const click_handler_14 = () => clearCheckedItems();
    	const click_handler_15 = () => refreshAutomaticItems();
    	const click_handler_16 = () => toggleFoodLogModal();
    	const click_handler_17 = () => toggleDetailModal();

    	const click_handler_18 = () => {
    		useItem(selectedItem);
    		toggleDetailModal();
    	};

    	const input_handler_1 = e => {
    		$$invalidate(11, selectedItem.brand = e.target.value, selectedItem);
    		$$invalidate(1, inventoryItems);
    	};

    	const input_handler_2 = e => {
    		$$invalidate(11, selectedItem.price = parseFloat(e.target.value) || 0, selectedItem);
    		$$invalidate(1, inventoryItems);
    	};

    	const func_4 = recipe => recipe.ingredients.some(ing => ing.name === selectedItem.name);

    	const click_handler_19 = recipe => {
    		toggleDetailModal();
    		toggleRecipeDetail(recipe);
    	};

    	const click_handler_21 = () => toggleDetailModal();
    	const click_handler_22 = () => toggleRecipeDetail();
    	const click_handler_24 = () => toggleRecipeDetail();

    	function input0_input_handler() {
    		newItem.name = this.value;
    		$$invalidate(16, newItem);
    		$$invalidate(23, categories);
    	}

    	function select0_change_handler_1() {
    		newItem.category = select_value(this);
    		$$invalidate(16, newItem);
    		$$invalidate(23, categories);
    	}

    	function input1_input_handler() {
    		newItem.quantityAmount = to_number(this.value);
    		$$invalidate(16, newItem);
    		$$invalidate(23, categories);
    	}

    	function select1_change_handler_1() {
    		newItem.quantityType = select_value(this);
    		$$invalidate(16, newItem);
    		$$invalidate(23, categories);
    	}

    	function select2_change_handler_1() {
    		newItem.location = select_value(this);
    		$$invalidate(16, newItem);
    		$$invalidate(23, categories);
    	}

    	function input2_input_handler() {
    		newItem.brand = this.value;
    		$$invalidate(16, newItem);
    		$$invalidate(23, categories);
    	}

    	function input3_input_handler() {
    		newItem.price = to_number(this.value);
    		$$invalidate(16, newItem);
    		$$invalidate(23, categories);
    	}

    	function input4_input_handler() {
    		newItem.expiry = this.value;
    		$$invalidate(16, newItem);
    		$$invalidate(23, categories);
    	}

    	const click_handler_25 = e => {
    		e.preventDefault();

    		try {
    			// Modern browsers
    			document.getElementById("expiry").showPicker();
    		} catch(err) {
    			// Fallback for browsers without showPicker
    			document.getElementById("expiry").focus();
    		}
    	};

    	const submit_handler = () => {
    		// Add food log entry logic would go here
    		toggleFoodLogModal();
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		inventoryItems,
    		recipeItems,
    		shoppingList,
    		categories,
    		locations,
    		quantityTypes,
    		activeTab,
    		selectedLocation,
    		selectedCategory,
    		sortBy,
    		sortOrder,
    		searchQuery,
    		isAddItemModalOpen,
    		isDetailModalOpen,
    		isRecipeDetailOpen,
    		isFoodLogModalOpen,
    		selectedItem,
    		selectedRecipe,
    		filteredItems,
    		adjustAmount,
    		notification,
    		foodLog,
    		newItem,
    		formErrors,
    		newShoppingItem,
    		toggleShoppingItemChecked,
    		setActiveTab,
    		filterInventory,
    		toggleAddItemModal,
    		toggleDetailModal,
    		toggleRecipeDetail,
    		toggleFoodLogModal,
    		calculateDaysUntilExpiry,
    		getExpiryStatusClass,
    		formatCurrency,
    		validateNewItemForm,
    		addNewItem,
    		resetNewItemForm,
    		addToShoppingList,
    		adjustItemQuantity,
    		filterRecipes,
    		filterShoppingList,
    		filterFoodLog,
    		sortShoppingList,
    		clearCheckedItems,
    		refreshAutomaticItems,
    		deleteShoppingItem,
    		showNotification,
    		hasAutomaticItems,
    		filteredFoodLog,
    		filteredShoppingList,
    		filteredRecipes
    	});

    	$$self.$inject_state = $$props => {
    		if ('inventoryItems' in $$props) $$invalidate(1, inventoryItems = $$props.inventoryItems);
    		if ('shoppingList' in $$props) $$invalidate(44, shoppingList = $$props.shoppingList);
    		if ('activeTab' in $$props) $$invalidate(2, activeTab = $$props.activeTab);
    		if ('selectedLocation' in $$props) $$invalidate(3, selectedLocation = $$props.selectedLocation);
    		if ('selectedCategory' in $$props) $$invalidate(4, selectedCategory = $$props.selectedCategory);
    		if ('sortBy' in $$props) $$invalidate(5, sortBy = $$props.sortBy);
    		if ('sortOrder' in $$props) $$invalidate(6, sortOrder = $$props.sortOrder);
    		if ('searchQuery' in $$props) $$invalidate(0, searchQuery = $$props.searchQuery);
    		if ('isAddItemModalOpen' in $$props) $$invalidate(7, isAddItemModalOpen = $$props.isAddItemModalOpen);
    		if ('isDetailModalOpen' in $$props) $$invalidate(8, isDetailModalOpen = $$props.isDetailModalOpen);
    		if ('isRecipeDetailOpen' in $$props) $$invalidate(9, isRecipeDetailOpen = $$props.isRecipeDetailOpen);
    		if ('isFoodLogModalOpen' in $$props) $$invalidate(10, isFoodLogModalOpen = $$props.isFoodLogModalOpen);
    		if ('selectedItem' in $$props) $$invalidate(11, selectedItem = $$props.selectedItem);
    		if ('selectedRecipe' in $$props) $$invalidate(12, selectedRecipe = $$props.selectedRecipe);
    		if ('filteredItems' in $$props) $$invalidate(13, filteredItems = $$props.filteredItems);
    		if ('adjustAmount' in $$props) $$invalidate(14, adjustAmount = $$props.adjustAmount);
    		if ('notification' in $$props) $$invalidate(15, notification = $$props.notification);
    		if ('newItem' in $$props) $$invalidate(16, newItem = $$props.newItem);
    		if ('formErrors' in $$props) $$invalidate(17, formErrors = $$props.formErrors);
    		if ('newShoppingItem' in $$props) $$invalidate(18, newShoppingItem = $$props.newShoppingItem);
    		if ('hasAutomaticItems' in $$props) $$invalidate(19, hasAutomaticItems = $$props.hasAutomaticItems);
    		if ('filteredFoodLog' in $$props) $$invalidate(20, filteredFoodLog = $$props.filteredFoodLog);
    		if ('filteredShoppingList' in $$props) $$invalidate(21, filteredShoppingList = $$props.filteredShoppingList);
    		if ('filteredRecipes' in $$props) $$invalidate(22, filteredRecipes = $$props.filteredRecipes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*searchQuery*/ 1) {
    			// Make filter functions react to search query changes
    			{
    				if (searchQuery) {
    					filterInventory();
    					$$invalidate(22, filteredRecipes = filterRecipes());
    					$$invalidate(21, filteredShoppingList = filterShoppingList());
    					$$invalidate(20, filteredFoodLog = filterFoodLog());
    				}
    			}
    		}

    		if ($$self.$$.dirty[1] & /*shoppingList*/ 8192) {
    			// Check if we have automatic items
    			$$invalidate(19, hasAutomaticItems = shoppingList.some(item => item.automatic));
    		}
    	};

    	$$invalidate(22, filteredRecipes = filterRecipes());
    	$$invalidate(21, filteredShoppingList = filterShoppingList());
    	$$invalidate(20, filteredFoodLog = filterFoodLog());

    	{
    		filterInventory();
    	}

    	return [
    		searchQuery,
    		inventoryItems,
    		activeTab,
    		selectedLocation,
    		selectedCategory,
    		sortBy,
    		sortOrder,
    		isAddItemModalOpen,
    		isDetailModalOpen,
    		isRecipeDetailOpen,
    		isFoodLogModalOpen,
    		selectedItem,
    		selectedRecipe,
    		filteredItems,
    		adjustAmount,
    		notification,
    		newItem,
    		formErrors,
    		newShoppingItem,
    		hasAutomaticItems,
    		filteredFoodLog,
    		filteredShoppingList,
    		filteredRecipes,
    		categories,
    		locations,
    		quantityTypes,
    		toggleShoppingItemChecked,
    		setActiveTab,
    		filterInventory,
    		toggleAddItemModal,
    		toggleDetailModal,
    		toggleRecipeDetail,
    		toggleFoodLogModal,
    		addNewItem,
    		addToShoppingList,
    		adjustItemQuantity,
    		filterRecipes,
    		filterShoppingList,
    		filterFoodLog,
    		sortShoppingList,
    		clearCheckedItems,
    		refreshAutomaticItems,
    		deleteShoppingItem,
    		showNotification,
    		shoppingList,
    		click_handler,
    		input_input_handler,
    		input_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		select0_change_handler,
    		select1_change_handler,
    		select2_change_handler,
    		click_handler_5,
    		input_input_handler_1,
    		click_handler_8,
    		click_handler_9,
    		click_handler_10,
    		click_handler_11,
    		input_input_handler_2,
    		keypress_handler,
    		change_handler,
    		click_handler_12,
    		input_input_handler_3,
    		keypress_handler_1,
    		click_handler_13,
    		click_handler_14,
    		click_handler_15,
    		click_handler_16,
    		click_handler_17,
    		click_handler_18,
    		input_handler_1,
    		input_handler_2,
    		func_4,
    		click_handler_19,
    		click_handler_21,
    		click_handler_22,
    		click_handler_24,
    		input0_input_handler,
    		select0_change_handler_1,
    		input1_input_handler,
    		select1_change_handler_1,
    		select2_change_handler_1,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		click_handler_25,
    		submit_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1, -1, -1, -1]);

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
