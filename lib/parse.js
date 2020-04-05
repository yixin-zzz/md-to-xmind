const unified = require('unified');
const remarkParse = require('remark-parse');
const _ = require('lodash');

const remark = unified()
    .use(remarkParse, { position: false });

const BlockContent = ['paragraph', 'heading', 'blockquote', 'code'];
const StaticPhrasingContent = ['text', 'emphasis', 'strong', 'inlineCode', 'link'];
const ListContent = ['listItem'];

/**
 * get value for a blockContent
 * @param {node} text
 * @returns {str}
 */
function getBlockValue(node) {
    let res = [];
    const { parentId } = node;
    const getValue = (item, parentId) => {
        const { children } = item;
        let hasPhrasingItem = children.some(item => item.type in StaticPhrasingContent);
        let pid = hasPhrasingItem ? `${parentId}-ind` : parentId;
        children.forEach(child => {
            const { type, children, ...rest } = child;
            if (type in StaticPhrasingContent) {
                hasPhrasingItem = true;
                res.push({
                    type,
                    ...rest,
                    parentId
                })
            } else {
                getValue(child, pid);
            }
        })
    }
    getValue(node, parentId);
    return res;
}

/**
 * flatten a tree-structure list node to arr
 * @param {node} text
 * @returns {arr}
 */
function flattenList(list) {
    let res = [];
    const getListItem = (item, parentId) => {
        const { type, children, ...res } = item;
        if (type === 'listItem') {
            
        }
    }
    return [];
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

    return {
        type: 'root',
        content: md
    };
}

module.exports = {
    parse
}