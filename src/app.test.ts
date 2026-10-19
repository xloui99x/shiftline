import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { mountApp } from './app';

const markup = readFileSync(resolve(import.meta.dirname, '../index.html'), 'utf8');
const body = /<body>([\s\S]*)<\/body>/.exec(markup)?.[1] ?? '';

function setup() {
  document.body.innerHTML = body;
  const root = document.getElementById('app')!;
  const app = mountApp(root, { reduceMotion: true });
  return { app, root, user: userEvent.setup() };
}

beforeEach(() => {
  // jsdom lacks these browser APIs.
  window.requestAnimationFrame = (callback) => {
    callback(0);
    return 0;
  };
});

describe('Shiftline', () => {
  it('opens on the most severe line with a one-sentence headline', () => {
    setup();
    expect(document.getElementById('headline')).toHaveTextContent(
      'Scrap on Line 3 has tripled since 16:40',
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
    ]);
  });

  it('switches lines from the rail', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('tab', { name: /Line 2 · Packaging/ }));
    expect(document.getElementById('headline')).toHaveTextContent(
      'Label rejects on Line 2 are trending upward',
    );
    expect(document.querySelector('#chartTitle')).toHaveTextContent('Label rejects this shift');
    expect(screen.getByText(/Change the label roll at 19:30/)).toBeInTheDocument();
  });

  it('shows the recommendation first and the evidence only to experts', async () => {
    const { root, user } = setup();
    expect(root).toHaveClass('frontline');

    await user.click(screen.getByRole('button', { name: 'See why' }));
    expect(root).toHaveClass('expert');
    expect(screen.getByRole('button', { name: 'Process expert' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('updates prediction, savings and recommendation in the virtual experiment', async () => {
    const { user } = setup();
    const results = document.getElementById('results')!;
    expect(within(results).getByText('1.2 %')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox'));
    expect(within(results).getByText('1.6 %')).toBeInTheDocument();
    expect(document.getElementById('actionMeta')).toHaveTextContent(
      'Adjusted in the virtual experiment',
    );
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Lower zone 2 to 213.0 °C');

    await user.click(screen.getByRole('button', { name: 'Reset to the recommended settings' }));
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(document.getElementById('actionMeta')).toHaveTextContent('recommended');
  });

  it('lets a person approve and undo the change', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Approve change' }));
    expect(screen.getByText(/Approved. The Line 3 crew has the instruction/)).toBeInTheDocument();
    expect(document.getElementById('toast')).toHaveTextContent('Change approved');

    await user.click(screen.getByRole('button', { name: 'Undo approval' }));
    expect(screen.getByRole('button', { name: 'Approve change' })).toBeInTheDocument();
  });

  it('asks for a reason when a recommendation is dismissed', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await user.selectOptions(screen.getByLabelText('Why not?'), 'The cause looks wrong');
    await user.click(screen.getByRole('button', { name: 'Confirm dismiss' }));
    expect(document.getElementById('toast')).toHaveTextContent('Your reason improves');
  });

  it('expands the evidence of a root cause', async () => {
    const { user } = setup();
    const second = screen.getByRole('button', { name: /Resin lot change/ });
    expect(second).toHaveAttribute('aria-expanded', 'false');
    await user.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Lot switched at 16:10')).toBeVisible();
  });

  it('has nothing to do on a stable line', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('tab', { name: /Line 1/ }));
    expect(screen.getByText(/Nothing to do on Line 1/)).toBeInTheDocument();
    expect(document.getElementById('lg-proj')).not.toBeVisible();
  });

  it('toggles the design notes', async () => {
    const { root, user } = setup();
    const button = screen.getByRole('button', { name: 'Show design notes' });
    await user.click(button);
    expect(root).toHaveClass('notes-on');
    expect(button).toHaveTextContent('Hide design notes');
  });
});
