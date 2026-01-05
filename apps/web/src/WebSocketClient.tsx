import { useState, useEffect, useRef, type FormEvent } from "react";

type Message = {
	type: string;
	message?: string;
	data?: unknown;
	original?: unknown;
	timestamp: number;
};

type ConnectionStatus = "disconnected" | "connecting" | "connected";

export function WebSocketClient() {
	const [status, setStatus] = useState<ConnectionStatus>("disconnected");
	const [messages, setMessages] = useState<Message[]>([]);
	const [messageInput, setMessageInput] = useState("");
	const wsRef = useRef<WebSocket | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const WS_URL = "ws://localhost:3001";

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const connect = () => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			return;
		}

		setStatus("connecting");
		const ws = new WebSocket(WS_URL);

		ws.onopen = () => {
			setStatus("connected");
			wsRef.current = ws;
		};

		ws.onmessage = (event) => {
			try {
				const data: Message = JSON.parse(event.data);
				setMessages((prev) => [...prev, data]);
			} catch (error) {
				console.error("Error parsing message:", error);
			}
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
			setStatus("disconnected");
		};

		ws.onclose = () => {
			setStatus("disconnected");
			wsRef.current = null;
		};
	};

	const disconnect = () => {
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
		setStatus("disconnected");
	};

	const sendMessage = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!messageInput.trim() || status !== "connected") {
			return;
		}

		try {
			const message = JSON.parse(messageInput);
			wsRef.current?.send(JSON.stringify(message));
			setMessageInput("");
		} catch {
			// If not valid JSON, send as a simple message object
			wsRef.current?.send(
				JSON.stringify({
					type: "message",
					text: messageInput,
				})
			);
			setMessageInput("");
		}
	};

	const clearMessages = () => {
		setMessages([]);
	};

	const formatTimestamp = (timestamp: number) => {
		return new Date(timestamp).toLocaleTimeString();
	};

	const getStatusColor = () => {
		switch (status) {
			case "connected":
				return "#4ade80";
			case "connecting":
				return "#fbbf24";
			default:
				return "#ef4444";
		}
	};

	return (
		<div className="websocket-client">
			<div className="websocket-header">
				<h2>WebSocket Client</h2>
				<div className="status-indicator">
					<span
						className="status-dot"
						style={{ backgroundColor: getStatusColor() }}
					/>
					<span className="status-text">{status}</span>
				</div>
			</div>

			<div className="connection-controls">
				{status === "disconnected" ? (
					<button onClick={connect} className="connect-button">
						Connect
					</button>
				) : (
					<button onClick={disconnect} className="disconnect-button">
						Disconnect
					</button>
				)}
				{messages.length > 0 && (
					<button onClick={clearMessages} className="clear-button">
						Clear Messages
					</button>
				)}
			</div>

			<div className="messages-container">
				<div className="messages-list">
					{messages.length === 0 ? (
						<div className="empty-messages">
							No messages yet. Connect to start receiving
							messages.
						</div>
					) : (
						messages.map((msg, index) => (
							<div key={index} className="message-item">
								<div className="message-header">
									<span className="message-type">
										{msg.type}
									</span>
									<span className="message-time">
										{formatTimestamp(msg.timestamp)}
									</span>
								</div>
								<div className="message-content">
									{msg.message && <p>{msg.message}</p>}
									{msg.data && (
										<pre>
											{JSON.stringify(msg.data, null, 2)}
										</pre>
									)}
									{msg.original && (
										<pre>
											{JSON.stringify(
												msg.original,
												null,
												2
											)}
										</pre>
									)}
									{!msg.message &&
										!msg.data &&
										!msg.original && (
											<pre>
												{JSON.stringify(msg, null, 2)}
											</pre>
										)}
								</div>
							</div>
						))
					)}
					<div ref={messagesEndRef} />
				</div>
			</div>

			<form onSubmit={sendMessage} className="message-form">
				<input
					type="text"
					value={messageInput}
					onChange={(e) => setMessageInput(e.target.value)}
					placeholder={
						status === "connected"
							? 'Enter message (JSON or plain text, e.g., {"type": "test", "text": "hello"})'
							: "Connect first to send messages"
					}
					disabled={status !== "connected"}
					className="message-input"
				/>
				<button
					type="submit"
					disabled={status !== "connected" || !messageInput.trim()}
					className="send-message-button"
				>
					Send
				</button>
			</form>
		</div>
	);
}
