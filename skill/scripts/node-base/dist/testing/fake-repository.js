"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeIssuesRepository = void 0;
function cloneIssue(issue) {
    return { ...issue };
}
function cloneComment(comment) {
    return { ...comment };
}
class FakeIssuesRepository {
    operationLog = [];
    store;
    nextIssueNumber;
    nextIssueId;
    nextCommentId;
    constructor(seeds = {}) {
        const issues = new Map();
        const comments = new Map();
        const parentByChild = new Map();
        const subIssuesByParent = new Map();
        for (const seed of Object.values(seeds)) {
            issues.set(seed.issue.number, cloneIssue(seed.issue));
            comments.set(seed.issue.number, seed.comments.map(cloneComment));
            if (seed.subIssues) {
                subIssuesByParent.set(seed.issue.number, seed.subIssues.map((issue) => issue.number));
                for (const subIssue of seed.subIssues) {
                    issues.set(subIssue.number, cloneIssue(subIssue));
                    if (!comments.has(subIssue.number)) {
                        comments.set(subIssue.number, []);
                    }
                    parentByChild.set(subIssue.number, seed.issue.number);
                }
            }
            if (seed.parentIssue) {
                issues.set(seed.parentIssue.number, cloneIssue(seed.parentIssue));
                if (!comments.has(seed.parentIssue.number)) {
                    comments.set(seed.parentIssue.number, []);
                }
                parentByChild.set(seed.issue.number, seed.parentIssue.number);
                const siblings = subIssuesByParent.get(seed.parentIssue.number) ?? [];
                if (!siblings.includes(seed.issue.number)) {
                    siblings.push(seed.issue.number);
                    subIssuesByParent.set(seed.parentIssue.number, siblings);
                }
            }
        }
        const maxNumber = Math.max(1000, ...issues.keys());
        const maxIssueId = Math.max(2000, ...[...issues.values()].map((issue) => issue.id));
        const maxCommentId = Math.max(3000, ...[...comments.values()].flat().map((comment) => comment.id));
        this.store = { issues, comments, parentByChild, subIssuesByParent };
        this.nextIssueNumber = maxNumber + 1;
        this.nextIssueId = maxIssueId + 1;
        this.nextCommentId = maxCommentId + 1;
    }
    async getIssue(issueNumber) {
        this.operationLog.push(`getIssue:${issueNumber}`);
        const issue = this.store.issues.get(issueNumber);
        if (!issue) {
            throw new Error(`Issue ${issueNumber} not found`);
        }
        return cloneIssue(issue);
    }
    async listIssues(filters = {}) {
        this.operationLog.push(`listIssues:${filters.state ?? "all"}`);
        const allIssues = [...this.store.issues.values()];
        if (!filters.state || filters.state === "all") {
            return allIssues.map(cloneIssue);
        }
        return allIssues.filter((issue) => issue.state === filters.state).map(cloneIssue);
    }
    async createIssue(input) {
        this.operationLog.push(`createIssue:${input.title}`);
        const issue = {
            id: this.nextIssueId++,
            number: this.nextIssueNumber++,
            title: input.title,
            body: input.body,
            state: "open",
            html_url: `https://example.com/issues/${this.nextIssueNumber}`,
        };
        this.store.issues.set(issue.number, issue);
        this.store.comments.set(issue.number, []);
        return cloneIssue(issue);
    }
    async updateIssue(issueNumber, patch) {
        this.operationLog.push(`updateIssue:${issueNumber}`);
        const issue = await this.getIssue(issueNumber);
        const updated = {
            ...issue,
            title: patch.title ?? issue.title,
            body: patch.body ?? issue.body,
            state: patch.state ?? issue.state,
        };
        this.store.issues.set(issueNumber, updated);
        return cloneIssue(updated);
    }
    async closeIssue(issueNumber) {
        this.operationLog.push(`closeIssue:${issueNumber}`);
        return this.updateIssue(issueNumber, { state: "closed" });
    }
    async reopenIssue(issueNumber) {
        this.operationLog.push(`reopenIssue:${issueNumber}`);
        return this.updateIssue(issueNumber, { state: "open" });
    }
    async listComments(issueNumber) {
        this.operationLog.push(`listComments:${issueNumber}`);
        return (this.store.comments.get(issueNumber) ?? []).map(cloneComment);
    }
    async addComment(issueNumber, body) {
        this.operationLog.push(`addComment:${issueNumber}`);
        const comment = {
            id: this.nextCommentId++,
            body,
            html_url: `https://example.com/comments/${this.nextCommentId}`,
            created_at: `2026-03-29T00:00:${String(this.nextCommentId % 60).padStart(2, "0")}.000Z`,
            updated_at: `2026-03-29T00:00:${String(this.nextCommentId % 60).padStart(2, "0")}.000Z`,
        };
        const comments = this.store.comments.get(issueNumber) ?? [];
        comments.push(comment);
        this.store.comments.set(issueNumber, comments);
        return cloneComment(comment);
    }
    async listSubIssues(issueNumber) {
        this.operationLog.push(`listSubIssues:${issueNumber}`);
        const numbers = this.store.subIssuesByParent.get(issueNumber) ?? [];
        return numbers.map((number) => cloneIssue(this.store.issues.get(number)));
    }
    async getParentIssue(issueNumber) {
        this.operationLog.push(`getParentIssue:${issueNumber}`);
        const parentNumber = this.store.parentByChild.get(issueNumber);
        if (!parentNumber) {
            throw new Error(`Parent issue for ${issueNumber} not found`);
        }
        return cloneIssue(this.store.issues.get(parentNumber));
    }
    async addSubIssue(parentIssueNumber, childIssueNumber, options = {}) {
        this.operationLog.push(`addSubIssue:${parentIssueNumber}:${childIssueNumber}`);
        if (options.replaceParent) {
            const previousParent = this.store.parentByChild.get(childIssueNumber);
            if (previousParent) {
                const siblings = this.store.subIssuesByParent.get(previousParent) ?? [];
                this.store.subIssuesByParent.set(previousParent, siblings.filter((issueNumber) => issueNumber !== childIssueNumber));
            }
        }
        this.store.parentByChild.set(childIssueNumber, parentIssueNumber);
        const siblings = this.store.subIssuesByParent.get(parentIssueNumber) ?? [];
        if (!siblings.includes(childIssueNumber)) {
            siblings.push(childIssueNumber);
            this.store.subIssuesByParent.set(parentIssueNumber, siblings);
        }
    }
    async removeSubIssue(parentIssueNumber, childIssueNumber) {
        this.operationLog.push(`removeSubIssue:${parentIssueNumber}:${childIssueNumber}`);
        const siblings = this.store.subIssuesByParent.get(parentIssueNumber) ?? [];
        this.store.subIssuesByParent.set(parentIssueNumber, siblings.filter((issueNumber) => issueNumber !== childIssueNumber));
        this.store.parentByChild.delete(childIssueNumber);
    }
    async reprioritizeSubIssue(parentIssueNumber, input) {
        this.operationLog.push(`reprioritizeSubIssue:${parentIssueNumber}:${input.subIssueId}`);
        const siblings = [...(this.store.subIssuesByParent.get(parentIssueNumber) ?? [])].filter((issueNumber) => issueNumber !== input.subIssueId);
        const afterIndex = input.afterId === undefined ? -1 : siblings.indexOf(input.afterId);
        siblings.splice(afterIndex + 1, 0, input.subIssueId);
        this.store.subIssuesByParent.set(parentIssueNumber, siblings);
    }
}
exports.FakeIssuesRepository = FakeIssuesRepository;
