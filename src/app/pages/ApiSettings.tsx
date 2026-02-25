import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ArrowLeft, Save, Key, ExternalLink, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { apiKeys, API_KEY_INFO, ApiKeyName } from '../services/apiKeys';

export default function ApiSettings() {
    const [values, setValues] = useState<Record<ApiKeyName, string>>(apiKeys.getAll());
    const [saved, setSaved] = useState<Record<string, boolean>>({});
    const [visible, setVisible] = useState<Record<string, boolean>>({});

    const handleSave = (key: ApiKeyName) => {
        apiKeys.set(key, values[key]);
        setSaved(prev => ({ ...prev, [key]: true }));
        setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000);
    };

    const handleSaveAll = () => {
        (Object.keys(values) as ApiKeyName[]).forEach(k => apiKeys.set(k, values[k]));
        const allSaved = Object.fromEntries(Object.keys(values).map(k => [k, true]));
        setSaved(allSaved);
        setTimeout(() => setSaved({}), 2000);
    };

    return (
        <div className="min-h-screen bg-[#0B0F1A]">
            {/* Header */}
            <div className="border-b border-white/10 bg-[#111827] sticky top-0 z-10 backdrop-blur">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </motion.button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-purple-400" />
                            <h1 className="text-xl font-bold text-white">API Settings</h1>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveAll}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all"
                    >
                        <Save className="w-4 h-4" />
                        Save All
                    </motion.button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-10 space-y-4">
                {/* Info banner */}
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
                    🔐 Le chiavi API vengono salvate nel tuo browser (localStorage) e non vengono mai inviate a server esterni.
                    Configura almeno una chiave per attivare le ricerche reali per i giochi corrispondenti.
                </div>

                {/* API Key cards */}
                {(Object.entries(API_KEY_INFO) as [ApiKeyName, typeof API_KEY_INFO[ApiKeyName]][]).map(([key, info]) => (
                    <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#111827] border border-white/10 rounded-2xl p-6"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-white font-semibold">{info.label}</h2>
                                    {apiKeys.has(key) && (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 font-medium">
                                            ✓ Configurata
                                        </span>
                                    )}
                                </div>
                                <p className="text-white/40 text-xs">
                                    Giochi: <span className="text-white/60">{info.games.join(', ')}</span>
                                </p>
                            </div>
                            <a
                                href={info.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                            >
                                Ottieni chiave <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type={visible[key] ? 'text' : 'password'}
                                    value={values[key]}
                                    onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                                    placeholder={info.placeholder}
                                    className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-sm font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setVisible(prev => ({ ...prev, [key]: !prev[key] }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                                >
                                    {visible[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSave(key)}
                                className={`px-4 py-3 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all whitespace-nowrap ${saved[key]
                                        ? 'bg-green-600 text-white'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                                    }`}
                            >
                                {saved[key] ? (
                                    <><CheckCircle className="w-4 h-4" /> Saved!</>
                                ) : (
                                    <><Save className="w-4 h-4" /> Save</>
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
