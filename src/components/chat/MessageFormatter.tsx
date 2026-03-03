

interface MessageFormatterProps {
    content: string;
}

export function MessageFormatter({ content }: MessageFormatterProps) {
    if (!content) return null;

    // Split by bold (**bold** or *bold*) and italic (_italic_)
    // We'll prioritize ** for bold as requested, and also handle * for bold (WhatsApp style)
    // and _ for italic.

    const parts = content.split(/(\*\*[\s\S]*?\*\*|\*[\s\S]*?\*|_[\s\S]*?_)/g);

    return (
        <p className="whitespace-pre-wrap leading-relaxed">
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <strong key={index} className="font-bold">{part.slice(1, -1)}</strong>;
                }
                if (part.startsWith('_') && part.endsWith('_')) {
                    return <em key={index} className="italic">{part.slice(1, -1)}</em>;
                }
                return part;
            })}
        </p>
    );
}
