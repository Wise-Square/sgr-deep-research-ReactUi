import React, { useState } from 'react';

type HistoryTabProps = {};

const HistoryTab: React.FC<HistoryTabProps> = ({}) => {
    const [historyItems, setHistoryItems] = useState([]);

    const addHistoryItem = () => {
        const newId = Math.random().toString(36).substr(2, 9);
        const newItem = `${newId}_id_${newId}`;
        setHistoryItems([...historyItems, newItem]);
    };

    const deleteHistoryItem = (index: number) => {
        setHistoryItems(historyItems.filter((_, i) => i !== index));
    };

    return (
        <div className="bottom-rect">
            <button className="btn btn-primary" onClick={addHistoryItem}>Add</button>
            {historyItems.map((item, index) => (
                <div key={index} style={{display: 'flex', alignItems: 'center', gap: '10px', margin: '5px 0'}}>
                    <li className="list-group-item list-group-item-action" style={{flex: 1, margin: 0}}>{item}</li>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteHistoryItem(index)}>Delete</button>
                </div>
            ))}
        </div>
    )
}

export default HistoryTab;