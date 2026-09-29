-- Gives every table the full text width. Each column gets a share of the
-- width by the length of its content, but never less than its longest word,
-- so that short columns do not break words.
function Table(tbl)
  local n = #tbl.colspecs
  local text, word = {}, {}
  for i = 1, n do
    text[i], word[i] = 1, 1
  end

  -- header cells are bold, so their words count as wider
  local function measure(rows, scale)
    for _, row in ipairs(rows) do
      for i, cell in ipairs(row.cells) do
        if i <= n then
          local s = pandoc.utils.stringify(cell.contents)
          text[i] = math.max(text[i], math.min(#s, 35))
          for w in s:gmatch("%S+") do
            word[i] = math.max(word[i], math.min(#w, 40) * scale)
          end
        end
      end
    end
  end

  measure(tbl.head.rows, 1.25)
  for _, body in ipairs(tbl.bodies) do
    measure(body.body, 1)
  end

  local weights, total = {}, 0
  for i = 1, n do
    weights[i] = math.max(text[i], word[i] * 1.7 + 2)
    total = total + weights[i]
  end
  for i = 1, n do
    tbl.colspecs[i][2] = weights[i] / total
  end
  return tbl
end
