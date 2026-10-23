/** @file Saved client command chains and optional keybindings. */
import React from 'react';
import { useClientMacroEditor } from '../../hooks/useClientMacroEditor';
import './ClientMacroSettings.css';

// --- Macro Settings View ---
export const ClientMacroSettings = () => {
    const editor = useClientMacroEditor();
    return <section className="client-macro-settings setting-group">
        <h3 className="setting-label">Client Macros</h3>
        <p>Save command chains and optional keybindings on this browser. Use one command per line or separate commands with semicolons.</p>
        <p><code>/alias orc hit orc; examine orc</code> saves a macro. Type <code>orc</code> to run it.</p>
        <form onSubmit={event => { event.preventDefault(); editor.submit(); }}>
            <label>Name<input className="setting-input" value={editor.name} onChange={event => editor.setName(event.target.value)} placeholder="orc" required /></label>
            <label>Commands<textarea className="setting-input" rows={4} value={editor.body} onChange={event => editor.setBody(event.target.value)} placeholder={'hit orc\nexamine orc'} required /></label>
            <label>Optional keybinding<input className="setting-input" readOnly value={editor.recording ? '' : editor.hotkey ?? ''}
                placeholder={editor.recording ? 'Press a key combination… Escape cancels' : 'Click here to record a keybinding'}
                onFocus={() => editor.setRecording(true)} onClick={() => editor.setRecording(true)} onBlur={() => editor.setRecording(false)} onKeyDown={editor.record} /></label>
            <small>Assigned keys run the bound macro. Macros send commands in order without waiting for replies.</small>
            {editor.error && <p role="alert">{editor.error}</p>}
            <div className="client-macro-controls"><button type="submit" className="btn-primary">{editor.editing ? 'Save changes' : 'Add macro'}</button>
                <button type="button" onClick={() => editor.setHotkey(null)}>Clear keybinding</button>
                {editor.editing && <button type="button" onClick={editor.reset}>Cancel edit</button>}</div>
        </form>
        {!editor.macros.length && <p>No client macros yet.</p>}
        {editor.macros.map(macro => <article key={macro.name}>
            <div><strong>{macro.name}</strong>{macro.hotkey && <small>{macro.hotkey}</small>}<pre>{macro.commands.join('\n')}</pre></div>
            <div className="client-macro-controls"><button type="button" onClick={() => editor.edit(macro)}>Edit</button>
                <button type="button" aria-label={`Delete macro ${macro.name}`} onClick={() => editor.deleteMacro(macro.name)}>Delete</button></div>
        </article>)}
    </section>;
};
