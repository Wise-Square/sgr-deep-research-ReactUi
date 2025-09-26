import React from 'react';

type ChatProps = {};

const Chat: React.FC<ChatProps> = ({}) => {
    const spoilers = [
        { id: 1, title: "Спойлер 1", content: "Я взял стандартный спойлер из документации bootstrap и попросил нейронку его размножить" },
        { id: 2, title: "Спойлер 2", content: "Я взял стандартный спойлер из документации bootstrap и попросил нейронку его размножить" },
        { id: 3, title: "Спойлер 3", content: "Я взял стандартный спойлер из документации bootstrap и попросил нейронку его размножить" },
        { id: 4, title: "Спойлер 4", content: "Я взял стандартный спойлер из документации bootstrap и попросил нейронку его размножить" },
        { id: 5, title: "Спойлер 5", content: "Я взял стандартный спойлер из документации bootstrap и попросил нейронку его размножить" },
        { id: 6, title: "Спойлер 6", content: "Я взял стандартный спойлер из документации bootstrap и попросил нейронку его размножить" },
        { id: 7, title: "Спойлер 7", content: "Я взял стандартный спойлер из документации bootstrap и попросил нейронку его размножить" },
        { id: 8, title: "Спойлер 8", content: "Я взял стандартный спойлер из документации bootstrap и попросил нейронку его размножить" }
    ];

    return (
        <div className="chat-container">
            {spoilers.map((spoiler) => (
                <div key={spoiler.id}>
                    <p>
                        <button 
                            className="btn btn-primary" 
                            type="button" 
                            data-bs-toggle="collapse" 
                            data-bs-target={`#collapseWidthExample${spoiler.id}`} 
                            aria-expanded="false" 
                            aria-controls={`collapseWidthExample${spoiler.id}`}
                        >
                            {spoiler.title}
                        </button>
                    </p>
                    <div style={{minHeight: '120px'}}>
                        <div className="collapse collapse-horizontal" id={`collapseWidthExample${spoiler.id}`}>
                            <div className="card card-body" style={{width: '300px'}}>
                                {spoiler.content}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default Chat;