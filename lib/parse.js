const unified = require('unified');
const remarkParse = require('remark-parse');
const _ = require('lodash');

const remark = unified()
    .use(remarkParse, { position: false });

const BlockContent = ['paragraph', 'heading', 'blockquote', 'code'];
const StaticPhrasingContent = ['text', 'emphasis', 'strong', 'inlineCode', 'link'];
const ListContent = ['list'];

/**
 * get value for a blockContent
 * @param {node} text
 * @returns {str}
 */
function getBlockValue(node) {
    let res = [];
    const getValue = (item) => {
        const { children } = item;
        if (!children) return;
        children.forEach(child => {
            const { type, value, url } = child;
            if (StaticPhrasingContent.includes(type)) {
                res.push(value || url)
            } else if (BlockContent.includes(type)) {
                getValue(child);
            }
        })
    }
    getValue(node);
    return res.join(' ');
}

/**
 * flatten a tree-structure list node to arr
 * @param {node} text
 * @returns {arr}
 */
function flattenList(node) {
    let res = [];
    const { parentId } = node;
    const getValue = (item, parentId) => {
        const { children } = item;
        if (!children) return;
        let hasNestedList = children.some(item => ListContent.includes(item.type));
        children.forEach((child, ind) => {
            let id = `${parentId}-${ind}`;
            let pid = hasNestedList ? id : parentId;
            const { type, children, value, ...rest } = child;
            if (!ListContent.includes(type)) {
                let val = value || getBlockValue(child);
                res.push({
                    type,
                    ...rest,
                    parentId: parentId,
                    id,
                    value: val
                });
            } else {
                children.forEach(item => getValue(item, pid));
            }
        })
    }
    node.children.forEach(item => getValue(item, parentId));
    return res;
}

/**
 * parse markdown text and return arr
 * @param {string} text
 * @returns {arr}
 */
function parse(text) {
    const md = remark.parse(text).children;
    const headingMap = {};

    // first round iteration, add id, value and headingMap
    md.map((node, ind) => {
        node.id = ind;
        if (node.type === 'heading') {
            const { depth } = node;
            if (depth in headingMap) {
                headingMap[depth].push(ind);
            } else {
                headingMap[depth] = [ind]
            }
        }
    });

    // second round iteration, add parental relations
    let prevDepth = -1;
    let prevDepthId = null;
    md.forEach(node => {
        const { type, id } = node;
        if (type === 'heading') {
            const { depth } = node;
            if (depth > prevDepth) {
                node.parentId = prevDepthId
            }
            if (depth === prevDepth) {
                let prevNode = md[prevDepthId];
                node.parentId = prevNode.parentId;
            }
            if (depth < prevDepth) {
                let lastDepth;
                for (let index = prevDepth; index > -1; index--) {
                    if (index in headingMap) {
                        lastDepth = index;
                        break;
                    } 
                }
                if (lastDepth) {
                    let depthArr = headingMap[lastDepth];
                    node.parentId = depthArr[_.findLastIndex(depthArr, (item) => item < prevDepthId)];
                } else {
                    node.parentId = null;
                }
            }
            prevDepthId = id;
            prevDepth = depth;
        } else {
            node.parentId = prevDepthId;
        }
    });

    // third round iteration, get value and flatten list
    let targetMd = [];
    md.forEach(node => {
        const { type } = node;
        if (BlockContent.includes(type)) {
            let val = getBlockValue(node);
            node.value = val;
            targetMd.push(node);
        } else if (ListContent.includes(type)) {
            let newArr = flattenList(node)
            targetMd = targetMd.concat(newArr);
        } else {
            targetMd.push(node);
        }
    })

    return {
        type: 'root',
        content: targetMd
    };
}

module.exports = {
    parse
}