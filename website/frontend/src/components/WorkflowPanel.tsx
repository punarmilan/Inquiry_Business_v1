import type { IconText } from '../types';

type WorkflowPanelProps = {
  id?: string;
  title: string;
  items: IconText[];
  tone: string;
};

function WorkflowPanel({ id, title, items, tone }: WorkflowPanelProps) {
  return (
    <article className={`workflowPanel ${tone}`} id={id}>
      <h3>{title}</h3>
      <div className="workflowItems">
        {items.map(({ icon: Icon, title: itemTitle, body }) => (
          <div className="workflowItem" key={itemTitle}>
            <span className="stepIcon">
              <Icon size={23} aria-hidden="true" />
            </span>
            <div>
              <strong>{itemTitle}</strong>
              <p>{body}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default WorkflowPanel;
