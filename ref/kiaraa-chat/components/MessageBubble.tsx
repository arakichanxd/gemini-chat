
import React, { useRef, useState, useEffect } from 'react';
import { Message, MessageType, Sender } from '../types';

interface MessageBubbleProps {
  message: Message;
  onDelete?: (messageId: string) => void;
  onImageClick?: (imageUrl: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onForward?: (message: Message) => void;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onDelete, onImageClick, onReact, onForward }) => {
  const isSelf = message.sender === Sender.USER;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const menuRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const timeString = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(new Date(message.timestamp));

  // Close menu/picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [message.audioUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2, 0.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    if (message.type === MessageType.IMAGE && message.imageUrl) {
      link.href = message.imageUrl;
      link.download = `image-${message.id}.png`;
    } else if (message.type === MessageType.AUDIO && message.audioUrl) {
      link.href = message.audioUrl;
      link.download = `audio-${message.id}.wav`;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowMenu(false);
  };

  const renderStatusTicks = () => {
    if (!isSelf) return null;

    if (message.status === 'sent') {
      return (
        <svg viewBox="0 0 16 15" width="16" height="15" fill="#8696a0" className="ml-1">
          <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L2.892 8.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
        </svg>
      );
    }

    if (message.status === 'delivered') {
      return (
        <svg viewBox="0 0 16 11" width="16" height="11" fill="#8696a0" className="ml-1">
          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
        </svg>
      );
    }

    if (message.status === 'read') {
      return (
        <svg viewBox="0 0 16 11" width="16" height="11" fill="#53bdeb" className="ml-1">
          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
        </svg>
      );
    }
  }

  return (
    <div className={`flex w-full mb-1 ${isSelf ? 'justify-end' : 'justify-start'} group/bubble relative mb-3`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[60%] rounded-lg shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] text-sm ${isSelf ? 'bg-wa-outgoing rounded-tr-none' : 'bg-wa-incoming rounded-tl-none'
          } ${message.type === MessageType.IMAGE ? 'p-1' : 'p-1.5'}`}
      >
        {/* Tail */}
        <div className={`absolute top-0 ${isSelf ? '-right-[8px]' : '-left-[8px]'}`}>
          <svg viewBox="0 0 8 13" width="8" height="13" className={isSelf ? 'fill-wa-outgoing' : 'fill-wa-incoming'}>
            <path d={isSelf ? "M5.188,1H0v11.193l6.467-8.625C7.526,2.156,6.958,1,5.188,1z" : "M-2.288,1H2.9v11.193l-6.467-8.625C-4.626,2.156,-4.058,1,-2.288,1z"} transform={isSelf ? "" : "scale(-1, 1) translate(-8, 0)"} />
          </svg>
        </div>

        {/* Reaction Picker Button (Hover) */}
        {!showReactionPicker && !showMenu && (
          <button
            className={`absolute top-1 ${isSelf ? 'left-[-28px]' : 'right-[-28px]'} opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 bg-gray-200 rounded-full hover:bg-gray-300`}
            onClick={(e) => {
              e.stopPropagation();
              setShowReactionPicker(true);
              setShowMenu(false);
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-gray-600"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 17.5c-4.14 0-7.5-3.36-7.5-7.5S7.86 4.5 12 4.5s7.5 3.36 7.5 7.5-3.36 7.5-7.5 7.5zm3.5-9c.83 0 1.5.67 1.5 1.5S16.33 13.5 15.5 13.5 14 12.83 14 12s.67-1.5 1.5-1.5zm-7 0c.83 0 1.5.67 1.5 1.5S9.33 13.5 8.5 13.5 7 12.83 7 12s.67-1.5 1.5-1.5zm.505 5l.725-1.785a.5.5 0 0 1 .927.001L10.725 10l1.785.725a.5.5 0 0 1 .001.927L10.725 12.5l-.725 1.785a.5.5 0 0 1-.927-.001L8.29 12.5l-1.785-.725a.5.5 0 0 1-.001-.927L8.29 10l.715-1.99z" /></svg>
          </button>
        )}

        {/* Reaction Picker */}
        {showReactionPicker && (
          <div ref={pickerRef} className={`absolute top-[-40px] ${isSelf ? 'right-0' : 'left-0'} bg-white shadow-xl rounded-full px-2 py-1 flex gap-2 z-30 animate-scale-in`}>
            {REACTIONS.map(emoji => (
              <button
                key={emoji}
                className="hover:scale-125 transition-transform text-lg"
                onClick={() => {
                  if (onReact) onReact(message.id, emoji);
                  setShowReactionPicker(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Dropdown Menu Trigger (Hover) */}
        <div
          className={`absolute top-1 ${isSelf ? 'right-1' : 'right-1'} opacity-0 group-hover/bubble:opacity-100 transition-opacity z-20 cursor-pointer bg-gradient-to-l from-black/20 rounded-full`}
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
            setShowReactionPicker(false);
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="text-gray-500 hover:text-gray-700 bg-white/50 rounded-full p-0.5">
            <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H6.666a.664.664 0 0 1 0-1.328h7.35a.664.664 0 0 1 0 1.328zM19 9.25H6.666a.664.664 0 0 1 0-1.328H19a.664.664 0 0 1 0 1.328z" transform="rotate(180 12 12)" />
            <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z" />
          </svg>
        </div>

        {/* Dropdown Menu */}
        {showMenu && (
          <div ref={menuRef} className="absolute top-6 right-2 bg-white shadow-lg rounded py-1 z-50 min-w-[140px] animate-fade-in text-gray-700">
            {/* Forward */}
            <button
              onClick={() => {
                if (onForward) onForward(message);
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
              <span>Forward</span>
            </button>
            {(message.type === MessageType.IMAGE || message.type === MessageType.AUDIO) && (
              <button
                onClick={handleDownload}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
              >
                <span>Download</span>
              </button>
            )}
            <button
              onClick={() => {
                if (onDelete) onDelete(message.id);
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-500"
            >
              Delete
            </button>
          </div>
        )}

        {/* --- CONTENT TYPES --- */}

        {/* 1. TEXT */}
        {message.type === MessageType.TEXT && (
          <div className="text-[#111b21] pb-4 px-2 pt-1 leading-relaxed whitespace-pre-wrap select-text min-w-[80px]">
            {message.text}
          </div>
        )}

        {/* 2. IMAGE */}
        {message.type === MessageType.IMAGE && message.imageUrl && (
          <div className="flex flex-col">
            <div
              className="rounded-lg overflow-hidden mb-1 cursor-pointer hover:brightness-95 transition-all"
              onClick={() => onImageClick && onImageClick(message.imageUrl!)}
            >
              <img src={message.imageUrl} alt="Sent Image" className="w-full h-auto object-cover max-h-[300px] min-w-[200px]" />
            </div>
            {message.text && (
              <div className="px-2 pt-1 pb-4 text-[#111b21] whitespace-pre-wrap">
                {message.text}
              </div>
            )}
            {!message.text && <div className="h-4"></div>}
          </div>
        )}

        {/* 3. AUDIO */}
        {message.type === MessageType.AUDIO && message.audioUrl && (
          <div className="flex items-center gap-3 pr-2 pb-4 pt-2 pl-2 min-w-[240px]">
            <audio ref={audioRef} src={message.audioUrl} />
            <button
              onClick={togglePlay}
              className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-600 transition-colors"
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <div className="flex-1 flex flex-col justify-center">
              <div className="w-full h-1 bg-gray-300 rounded-full overflow-hidden cursor-pointer">
                <div
                  className="h-full bg-wa-teal transition-all duration-100"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 mt-1 font-medium">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            {/* Speed Control Button */}
            <button
              onClick={cyclePlaybackRate}
              className="flex flex-col items-center justify-center ml-2 h-full opacity-80 hover:opacity-100 transition-opacity bg-gray-200 rounded-full w-8 h-8 text-[10px] font-bold text-gray-600"
              title="Change playback speed"
            >
              {playbackRate}x
            </button>
          </div>
        )}

        {/* Metadata (Time + Ticks) */}
        <div className={`absolute bottom-1 right-2 flex items-center select-none ${message.type === MessageType.IMAGE && !message.text ? 'text-white drop-shadow-md' : 'text-[#667781]'}`}>
          <span className="text-[11px] min-w-fit">{timeString}</span>
          {renderStatusTicks()}
        </div>

        {/* Reaction Display */}
        {message.reaction && (
          <div className={`absolute -bottom-2 ${isSelf ? 'left-2' : 'right-2'} bg-white border border-gray-100 shadow-sm rounded-full px-1.5 py-0.5 text-xs animate-bounce-in z-10`}>
            {message.reaction}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
