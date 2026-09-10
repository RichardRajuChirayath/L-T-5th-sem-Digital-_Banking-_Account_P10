/**
 * Minimal in-memory mock store for instant zero-dependency execution
 * Emulates the exact Mongoose models and queries needed for all 13 modules
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { ROLES, ACCOUNT_TYPES, ACCOUNT_STATUS, TRANSACTION_TYPES, APPROVAL_DECISIONS, LIMITS } = require('./constants');
const { generateReferenceNumber } = require('../utils/helpers');

class MockCollection {
  constructor(name) {
    this.name = name;
    this.docs = [];
  }

  async create(doc) {
    const newDoc = {
      _id: new mongooseLikeObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...doc
    };

    if (newDoc.password) {
      newDoc.comparePassword = async function(candidate) {
        return await bcrypt.compare(candidate, this.password);
      };
    }

    newDoc.save = async function() {
      newDoc.updatedAt = new Date();
      return newDoc;
    };

    this.docs.push(newDoc);
    return newDoc;
  }

  find(filter = {}) {
    return new QueryCursor(this.docs, filter, this);
  }

  async findOne(filter = {}) {
    const results = this._filter(this.docs, filter);
    return results[0] || null;
  }

  async findById(id) {
    const strId = id ? id.toString() : '';
    return this.docs.find(d => d._id.toString() === strId) || null;
  }

  async findByIdAndDelete(id) {
    const strId = id ? id.toString() : '';
    const idx = this.docs.findIndex(d => d._id.toString() === strId);
    if (idx !== -1) {
      return this.docs.splice(idx, 1)[0];
    }
    return null;
  }

  async countDocuments(filter = {}) {
    return this._filter(this.docs, filter).length;
  }

  async deleteMany() {
    this.docs = [];
    return { acknowledged: true };
  }

  async aggregate(pipeline = []) {
    let results = [...this.docs];
    for (const stage of pipeline) {
      if (stage.$match) {
        results = this._filter(results, stage.$match);
      }
      if (stage.$group) {
        const sumField = stage.$group.totalLiquidity?.$sum?.replace('$', '');
        const total = results.reduce((acc, curr) => acc + (curr[sumField] || 0), 0);
        return [{ _id: null, totalLiquidity: total }];
      }
    }
    return results;
  }

  _filter(list, filter) {
    return list.filter(item => {
      for (const key of Object.keys(filter)) {
        if (key === '_id') {
          const itemVal = item._id ? item._id.toString() : '';
          const targetVal = filter[key] ? filter[key].toString() : '';
          if (itemVal !== targetVal) return false;
          continue;
        }

        if (key === 'userId' && typeof filter[key] === 'object' && filter[key].toString) {
          if (item.userId?.toString() !== filter[key].toString()) return false;
          continue;
        }

        if (typeof filter[key] === 'object' && filter[key] !== null) {
          if (filter[key].$gte && new Date(item[key]) < new Date(filter[key].$gte)) return false;
          if (filter[key].$lte && new Date(item[key]) > new Date(filter[key].$lte)) return false;
          if (filter[key].$gt && item[key] <= filter[key].$gt) return false;
          continue;
        }

        if (item[key] !== filter[key]) return false;
      }
      return true;
    });
  }
}

function mongooseLikeObjectId() {
  const hex = crypto.randomBytes(12).toString('hex');
  return {
    toString: () => hex,
    _id: hex
  };
}

class QueryCursor {
  constructor(docs, filter, collection) {
    this.results = collection._filter(docs, filter);
  }

  sort(sortCriteria) {
    return this;
  }

  skip(n) {
    this.results = this.results.slice(n);
    return this;
  }

  limit(n) {
    this.results = this.results.slice(0, n);
    return this;
  }

  populate(field, select) {
    return this;
  }

  then(resolve, reject) {
    resolve(this.results);
  }
}

module.exports = {
  MockCollection
};
